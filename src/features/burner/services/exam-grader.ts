/**
 * Exam Grader Service
 * Grades exam answers using Cerebras LLM with LLM-as-judge methodology and Opik tracing.
 *
 * @see Requirements 5.1, 5.2, 5.5, 5.6, 9.6 - AI Exam Grading
 */

import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { z } from 'zod';
import type { ExamQuestion, Exam, ExamAnswer } from '../types/database';
import { getOpikTracker, withTrace, withSpan, type OpikTrace } from './opik-tracker';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Retry configuration for grading LLM calls
 * Implements exponential backoff as per requirements
 */
const GRADER_RETRY_CONFIG = {
    maxRetries: 3,
    backoffMs: [1000, 2000, 4000] as const, // Exponential backoff
};

/**
 * Cerebras model configuration for grading
 */
const GRADER_CEREBRAS_CONFIG = {
    model: 'zai-glm-4.7',
    maxCompletionTokens: 65536,
    temperature: 0.6,
    topP: 0.95,
};

/**
 * Pass threshold for exams (70%)
 */
const PASS_THRESHOLD = 70;

// ============================================================================
// API Key Management
// ============================================================================

/**
 * Manages Cerebras API keys for load balancing
 */
class CerebrasKeyManager {
    private keys: string[];
    private currentIndex: number = 0;

    constructor() {
        const keysEnv = process.env.CEREBRAS_API_KEYS || process.env.CEREBRAS_API_KEY || '';
        this.keys = keysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);

        if (this.keys.length === 0) {
            console.warn('[ExamGrader] No Cerebras API keys configured');
        }
    }

    /**
     * Gets the next API key using round-robin rotation
     */
    getNextKey(): string {
        if (this.keys.length === 0) {
            throw new Error('No Cerebras API keys configured. Set CEREBRAS_API_KEYS or CEREBRAS_API_KEY environment variable.');
        }

        const key = this.keys[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        return key;
    }

    /**
     * Gets the total number of available keys
     */
    getKeyCount(): number {
        return this.keys.length;
    }
}

// Singleton key manager
const keyManager = new CerebrasKeyManager();

// ============================================================================
// Prompt Template
// ============================================================================

/**
 * Answer grading prompt template (LLM-as-Judge)
 * Evaluates student answers fairly but rigorously
 */
const ANSWER_GRADING_PROMPT = `
You are a fair but rigorous academic grader. Evaluate the following answer.

Question: {question}
Question Type: {questionType}
{correctAnswerSection}

Student Answer: {userAnswer}

Evaluate based on:
1. Accuracy of information
2. Completeness of response
3. Demonstration of understanding
4. For application questions: quality of reasoning

Provide:
- Score: 0-100
- Detailed feedback explaining the score

Output format (JSON only, no markdown):
{
  "score": number,
  "feedback": "detailed feedback string"
}

Important:
- Score must be an integer between 0 and 100
- Feedback must explain why the score was given
- Be fair but rigorous - partial credit for partial understanding
- Return ONLY valid JSON, no additional text or markdown
`;

// ============================================================================
// Response Validation
// ============================================================================

/**
 * Zod schema for validating grading LLM response
 */
const gradeResultSchema = z.object({
    score: z.number().int().min(0).max(100),
    feedback: z.string().min(1, 'Feedback cannot be empty'),
});

/**
 * Validates and transforms LLM grading response
 */
function validateGradeResponse(rawResponse: string): { score: number; feedback: string } {
    // Try to extract JSON from the response
    let jsonStr = rawResponse.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    // Parse JSON
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (error) {
        throw new Error(`Failed to parse grading response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate with Zod
    const result = gradeResultSchema.safeParse(parsed);
    if (!result.success) {
        throw new Error(`Invalid grading response: ${result.error.message}`);
    }

    return result.data;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Result of grading a single answer
 */
export interface GradeResult {
    score: number;           // 0-100
    feedback: string;
    opikSpanId: string;
}

/**
 * Result of grading an entire exam
 */
export interface ExamGradeResult {
    overallScore: number;    // Weighted average
    passed: boolean;         // >= 70
    questionResults: GradeResult[];
    opikTraceId: string;
}

/**
 * Error types for exam grading
 */
export type GradingError =
    | { type: 'INVALID_SCORE'; message: string }
    | { type: 'TIMEOUT'; message: string }
    | { type: 'RATE_LIMITED'; message: string }
    | { type: 'MAX_RETRIES_EXCEEDED'; message: string }
    | { type: 'API_ERROR'; message: string };

/**
 * Custom error class for grading failures
 */
export class GradingException extends Error {
    constructor(
        public readonly error: GradingError,
        public readonly attempts: number
    ) {
        super(error.message);
        this.name = 'GradingException';
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Delays execution for the specified milliseconds
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Builds the grading prompt for a specific question and answer
 */
function buildGradingPrompt(question: ExamQuestion, userAnswer: string): string {
    const correctAnswerSection = question.correct_answer
        ? `Correct Answer: ${question.correct_answer}`
        : '';

    return ANSWER_GRADING_PROMPT
        .replace('{question}', question.question)
        .replace('{questionType}', question.type)
        .replace('{correctAnswerSection}', correctAnswerSection)
        .replace('{userAnswer}', userAnswer);
}

/**
 * Categorizes errors into specific types
 */
function categorizeError(error: unknown): GradingError {
    if (error instanceof GradingException) {
        return error.error;
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('rate limit') || message.includes('429')) {
        return { type: 'RATE_LIMITED', message };
    }

    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        return { type: 'TIMEOUT', message };
    }

    if (message.includes('score') || message.includes('Invalid')) {
        return { type: 'INVALID_SCORE', message };
    }

    return { type: 'API_ERROR', message };
}

// ============================================================================
// Main Service Functions
// ============================================================================

/**
 * Grades a single answer using LLM-as-judge methodology
 * 
 * @param question - The exam question being answered
 * @param userAnswer - The user's answer to grade
 * @returns Promise<GradeResult> - Score, feedback, and Opik span ID
 * @throws GradingException if grading fails after all retries
 * 
 * @example
 * ```typescript
 * const result = await gradeAnswer(question, "JavaScript uses prototypal inheritance...");
 * console.log(result.score); // 85
 * console.log(result.feedback); // "Good explanation of prototypal inheritance..."
 * ```
 */
export async function gradeAnswer(
    question: ExamQuestion,
    userAnswer: string
): Promise<GradeResult> {
    // Validate inputs
    if (!question || !question.question) {
        throw new GradingException(
            { type: 'INVALID_SCORE', message: 'Question cannot be empty' },
            0
        );
    }

    if (!userAnswer || userAnswer.trim().length === 0) {
        // Empty answer gets 0 score
        return {
            score: 0,
            feedback: 'No answer provided.',
            opikSpanId: `empty-answer-${Date.now()}`,
        };
    }

    // Use Opik tracing
    const { result, traceId } = await withTrace(
        'answer-grading',
        { questionId: question.id, questionType: question.type, userAnswer },
        async (trace) => {
            return await gradeAnswerWithRetry(question, userAnswer, trace);
        }
    );

    console.log(`[ExamGrader] Graded answer for question ${question.id}, score: ${result.score}, trace ID: ${traceId}`);
    return result;
}

/**
 * Internal function that handles retry logic for grading
 */
async function gradeAnswerWithRetry(
    question: ExamQuestion,
    userAnswer: string,
    trace: OpikTrace
): Promise<GradeResult> {
    let lastError: GradingError | null = null;

    for (let attempt = 1; attempt <= GRADER_RETRY_CONFIG.maxRetries; attempt++) {
        try {
            const result = await attemptGrading(question, userAnswer, trace, attempt);
            return result;
        } catch (error) {
            lastError = categorizeError(error);
            console.warn(
                `[ExamGrader] Attempt ${attempt}/${GRADER_RETRY_CONFIG.maxRetries} failed:`,
                lastError.message
            );

            // Don't wait after the last attempt
            if (attempt < GRADER_RETRY_CONFIG.maxRetries) {
                const backoffMs = GRADER_RETRY_CONFIG.backoffMs[attempt - 1];
                console.log(`[ExamGrader] Retrying in ${backoffMs}ms...`);
                await delay(backoffMs);
            }
        }
    }

    // All retries exhausted
    throw new GradingException(
        {
            type: 'MAX_RETRIES_EXCEEDED',
            message: `Failed to grade answer after ${GRADER_RETRY_CONFIG.maxRetries} attempts. Last error: ${lastError?.message || 'Unknown'}`,
        },
        GRADER_RETRY_CONFIG.maxRetries
    );
}

/**
 * Single attempt to grade an answer
 */
async function attemptGrading(
    question: ExamQuestion,
    userAnswer: string,
    trace: OpikTrace,
    attempt: number
): Promise<GradeResult> {
    const startTime = Date.now();

    // Get API key with rotation
    const apiKey = keyManager.getNextKey();

    // Create Cerebras client
    const cerebras = new Cerebras({
        apiKey,
    });

    // Build prompt
    const prompt = buildGradingPrompt(question, userAnswer);

    // Make LLM call with span tracking
    const { result: response, spanId } = await withSpan(
        trace,
        'cerebras-grading',
        'llm',
        async (span) => {
            const completion = await cerebras.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a fair but rigorous academic grader. Always respond with valid JSON only, no markdown formatting.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                model: GRADER_CEREBRAS_CONFIG.model,
                stream: false,
                max_completion_tokens: GRADER_CEREBRAS_CONFIG.maxCompletionTokens,
                temperature: GRADER_CEREBRAS_CONFIG.temperature,
                top_p: GRADER_CEREBRAS_CONFIG.topP,
            });

            return completion;
        }
    );

    const latencyMs = Date.now() - startTime;

    // Extract response content - handle Cerebras SDK types
    const choices = (response as { choices?: Array<{ message?: { content?: string } }> }).choices;
    const content = choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('Empty response from LLM');
    }

    // Extract usage info - handle Cerebras SDK types
    const usage = (response as { usage?: { total_tokens?: number } }).usage;
    const totalTokens = usage?.total_tokens;

    // Validate and parse response
    const gradeData = validateGradeResponse(content);

    // Log metrics with evaluation score
    const tracker = getOpikTracker();
    tracker.logMetrics(trace.id, {
        latencyMs,
        model: GRADER_CEREBRAS_CONFIG.model,
        tokenCount: totalTokens,
        promptVersion: 'v1.0',
        evaluationScore: gradeData.score, // Log the evaluation score as per requirement 9.6
    });

    console.log(
        `[ExamGrader] Attempt ${attempt} completed in ${latencyMs}ms, ` +
        `tokens: ${totalTokens || 'unknown'}, score: ${gradeData.score}`
    );

    return {
        score: gradeData.score,
        feedback: gradeData.feedback,
        opikSpanId: spanId,
    };
}

/**
 * Grades all answers for an exam and calculates overall results
 * 
 * @param exam - The exam containing questions
 * @param answers - Array of user answers to grade
 * @returns Promise<ExamGradeResult> - Overall score, pass/fail, and individual results
 * @throws GradingException if grading fails for any answer after all retries
 * 
 * @example
 * ```typescript
 * const result = await gradeExam(exam, answers);
 * console.log(result.overallScore); // 78
 * console.log(result.passed); // true
 * ```
 */
export async function gradeExam(
    exam: Exam,
    answers: ExamAnswer[]
): Promise<ExamGradeResult> {
    // Validate inputs
    if (!exam || !exam.questions || exam.questions.length === 0) {
        throw new GradingException(
            { type: 'INVALID_SCORE', message: 'Exam must have questions' },
            0
        );
    }

    if (!answers || answers.length === 0) {
        throw new GradingException(
            { type: 'INVALID_SCORE', message: 'No answers provided for grading' },
            0
        );
    }

    // Use Opik tracing for the entire exam grading
    const { result, traceId } = await withTrace(
        'exam-grading',
        { examId: exam.id, questionCount: exam.questions.length, answerCount: answers.length },
        async (trace) => {
            return await gradeExamQuestions(exam, answers, trace);
        }
    );

    console.log(
        `[ExamGrader] Graded exam ${exam.id}, overall score: ${result.overallScore}, ` +
        `passed: ${result.passed}, trace ID: ${traceId}`
    );

    return {
        ...result,
        opikTraceId: traceId,
    };
}

/**
 * Internal function to grade all exam questions
 */
async function gradeExamQuestions(
    exam: Exam,
    answers: ExamAnswer[],
    trace: OpikTrace
): Promise<Omit<ExamGradeResult, 'opikTraceId'>> {
    const questionResults: GradeResult[] = [];

    // Create a map of answers by question ID for quick lookup
    const answerMap = new Map<string, ExamAnswer>();
    for (const answer of answers) {
        answerMap.set(answer.question_id, answer);
    }

    // Grade each question
    for (const question of exam.questions) {
        const answer = answerMap.get(question.id);
        const userAnswer = answer?.user_answer || '';

        // Grade this answer with span tracking
        const { result: gradeResult, spanId } = await withSpan(
            trace,
            `grade-question-${question.id}`,
            'tool',
            async () => {
                // Handle empty answers
                if (!userAnswer || userAnswer.trim().length === 0) {
                    return {
                        score: 0,
                        feedback: 'No answer provided.',
                        opikSpanId: `empty-${question.id}`,
                    };
                }

                // Grade with retry logic
                return await gradeAnswerWithRetry(question, userAnswer, trace);
            }
        );

        questionResults.push({
            ...gradeResult,
            opikSpanId: spanId,
        });
    }

    // Calculate overall score as average of individual scores
    const totalScore = questionResults.reduce((sum, r) => sum + r.score, 0);
    const overallScore = Math.round(totalScore / questionResults.length);

    // Determine pass/fail based on 70% threshold
    const passed = overallScore >= PASS_THRESHOLD;

    // Log overall metrics
    const tracker = getOpikTracker();
    tracker.logMetrics(trace.id, {
        evaluationScore: overallScore,
        promptVersion: 'v1.0',
    });

    return {
        overallScore,
        passed,
        questionResults,
    };
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Exam Grader Service interface
 * Matches the design document specification
 */
export interface ExamGraderService {
    gradeAnswer(question: ExamQuestion, userAnswer: string): Promise<GradeResult>;
    gradeExam(exam: Exam, answers: ExamAnswer[]): Promise<ExamGradeResult>;
}

/**
 * Creates an exam grader service instance
 */
export function createExamGraderService(): ExamGraderService {
    return {
        gradeAnswer,
        gradeExam,
    };
}

// ============================================================================
// Exports
// ============================================================================

export {
    ANSWER_GRADING_PROMPT,
    GRADER_RETRY_CONFIG,
    GRADER_CEREBRAS_CONFIG,
    PASS_THRESHOLD,
    validateGradeResponse,
    buildGradingPrompt,
};
