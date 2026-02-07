/**
 * Exam Generator Service
 * Generates AI-powered exam questions using Cerebras LLM with Opik tracing.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5 - AI Exam Generation
 */

import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { ExamQuestion, QuestionType, QuestionDifficulty } from '../types/database';
import { getOpikTracker, withTrace, withSpan, type OpikTrace } from './opik-tracker';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Retry configuration for LLM calls
 * Implements exponential backoff as per requirements
 */
const RETRY_CONFIG = {
    maxRetries: 3,
    backoffMs: [1000, 2000, 4000] as const, // Exponential backoff
};

/**
 * Cerebras model configuration
 */
const CEREBRAS_CONFIG = {
    model: 'zai-glm-4.7',
    maxCompletionTokens: 65536,
    temperature: 0.6,
    topP: 0.95,
};

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
            console.warn('[ExamGenerator] No Cerebras API keys configured');
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
 * Exam generation prompt template
 * Generates rigorous questions to test genuine understanding
 */
const EXAM_GENERATION_PROMPT = `
You are a rigorous academic examiner. Generate {questionCount} exam questions 
to test genuine understanding of: {topic}

Requirements:
- Mix of question types: multiple choice, short answer, and application-based
- Target intermediate to advanced difficulty
- Questions should test deep understanding, not surface memorization
- Application questions should require applying concepts to novel scenarios
- Each question must have a unique ID (use UUID format)

Output format (JSON only, no markdown):
{
  "questions": [
    {
      "id": "unique-uuid",
      "type": "multiple_choice" | "short_answer" | "application",
      "question": "question text",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correct_answer": "A",
      "difficulty": "intermediate" | "advanced"
    }
  ]
}

Important:
- For multiple_choice: include exactly 4 options and correct_answer
- For short_answer and application: omit options and correct_answer fields
- Ensure a good mix of question types (at least one of each type)
- All questions must be intermediate or advanced difficulty
- Return ONLY valid JSON, no additional text or markdown
`;

// ============================================================================
// Response Validation
// ============================================================================

/**
 * Zod schema for validating LLM response
 */
const llmQuestionSchema = z.object({
    id: z.string(),
    type: z.enum(['multiple_choice', 'short_answer', 'application']),
    question: z.string().min(1, 'Question cannot be empty'),
    options: z.array(z.string()).optional(),
    correct_answer: z.string().optional(),
    difficulty: z.enum(['intermediate', 'advanced']),
});

const llmResponseSchema = z.object({
    questions: z.array(llmQuestionSchema).min(5).max(10),
});

/**
 * Validates and transforms LLM response to ExamQuestion[]
 */
function validateAndTransformResponse(
    rawResponse: string,
    expectedCount: number
): ExamQuestion[] {
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
        throw new Error(`Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate with Zod
    const result = llmResponseSchema.safeParse(parsed);
    if (!result.success) {
        throw new Error(`Invalid exam structure: ${result.error.message}`);
    }

    const { questions } = result.data;

    // Validate question count
    if (questions.length < 5 || questions.length > 10) {
        throw new Error(`Expected 5-10 questions, got ${questions.length}`);
    }

    // Validate question type mix (at least one of each type)
    const types = new Set(questions.map(q => q.type));
    const requiredTypes: QuestionType[] = ['multiple_choice', 'short_answer', 'application'];
    const missingTypes = requiredTypes.filter(t => !types.has(t));

    if (missingTypes.length > 0) {
        throw new Error(`Missing required question types: ${missingTypes.join(', ')}`);
    }

    // Validate multiple choice questions have options and correct_answer
    for (const q of questions) {
        if (q.type === 'multiple_choice') {
            if (!q.options || q.options.length !== 4) {
                throw new Error(`Multiple choice question "${q.id}" must have exactly 4 options`);
            }
            if (!q.correct_answer) {
                throw new Error(`Multiple choice question "${q.id}" must have a correct_answer`);
            }
        }
    }

    // Transform to ExamQuestion[] with proper UUIDs
    return questions.map(q => ({
        id: isValidUUID(q.id) ? q.id : uuidv4(),
        type: q.type as QuestionType,
        question: q.question,
        options: q.type === 'multiple_choice' ? q.options : undefined,
        correct_answer: q.type === 'multiple_choice' ? q.correct_answer : undefined,
        difficulty: q.difficulty as QuestionDifficulty,
    }));
}

/**
 * Checks if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error types for exam generation
 */
export type ExamGenerationError =
    | { type: 'INVALID_RESPONSE'; message: string }
    | { type: 'TIMEOUT'; message: string }
    | { type: 'RATE_LIMITED'; message: string }
    | { type: 'MAX_RETRIES_EXCEEDED'; message: string }
    | { type: 'API_ERROR'; message: string };

/**
 * Custom error class for exam generation failures
 */
export class ExamGenerationException extends Error {
    constructor(
        public readonly error: ExamGenerationError,
        public readonly attempts: number
    ) {
        super(error.message);
        this.name = 'ExamGenerationException';
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
 * Builds the prompt with topic and question count
 */
function buildPrompt(topic: string, questionCount: number): string {
    return EXAM_GENERATION_PROMPT
        .replace('{topic}', topic)
        .replace('{questionCount}', questionCount.toString());
}

// ============================================================================
// Main Service
// ============================================================================

/**
 * Generates exam questions using Cerebras LLM
 * 
 * @param topic - The learning topic to generate questions for
 * @param questionCount - Number of questions to generate (5-10)
 * @returns Promise<ExamQuestion[]> - Array of generated exam questions
 * @throws ExamGenerationException if generation fails after all retries
 * 
 * @example
 * ```typescript
 * const questions = await generateExam('JavaScript Promises', 7);
 * console.log(questions); // Array of 7 exam questions
 * ```
 */
export async function generateExam(
    topic: string,
    questionCount: number = 7
): Promise<ExamQuestion[]> {
    // Validate inputs
    if (!topic || topic.trim().length === 0) {
        throw new ExamGenerationException(
            { type: 'INVALID_RESPONSE', message: 'Topic cannot be empty' },
            0
        );
    }

    if (questionCount < 5 || questionCount > 10) {
        throw new ExamGenerationException(
            { type: 'INVALID_RESPONSE', message: 'Question count must be between 5 and 10' },
            0
        );
    }

    // Use Opik tracing
    const { result, traceId } = await withTrace(
        'exam-generation',
        { topic, questionCount },
        async (trace) => {
            return await generateExamWithRetry(topic, questionCount, trace);
        }
    );

    console.log(`[ExamGenerator] Generated ${result.length} questions, trace ID: ${traceId}`);
    return result;
}

/**
 * Internal function that handles retry logic
 */
async function generateExamWithRetry(
    topic: string,
    questionCount: number,
    trace: OpikTrace
): Promise<ExamQuestion[]> {
    let lastError: ExamGenerationError | null = null;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            const questions = await attemptGeneration(topic, questionCount, trace, attempt);
            return questions;
        } catch (error) {
            lastError = categorizeError(error);
            console.warn(
                `[ExamGenerator] Attempt ${attempt}/${RETRY_CONFIG.maxRetries} failed:`,
                lastError.message
            );

            // Don't wait after the last attempt
            if (attempt < RETRY_CONFIG.maxRetries) {
                const backoffMs = RETRY_CONFIG.backoffMs[attempt - 1];
                console.log(`[ExamGenerator] Retrying in ${backoffMs}ms...`);
                await delay(backoffMs);
            }
        }
    }

    // All retries exhausted
    throw new ExamGenerationException(
        {
            type: 'MAX_RETRIES_EXCEEDED',
            message: `Failed to generate exam after ${RETRY_CONFIG.maxRetries} attempts. Last error: ${lastError?.message || 'Unknown'}`,
        },
        RETRY_CONFIG.maxRetries
    );
}

/**
 * Single attempt to generate exam questions
 */
async function attemptGeneration(
    topic: string,
    questionCount: number,
    trace: OpikTrace,
    attempt: number
): Promise<ExamQuestion[]> {
    const startTime = Date.now();

    // Get API key with rotation
    const apiKey = keyManager.getNextKey();

    // Create Cerebras client
    const cerebras = new Cerebras({
        apiKey,
    });

    // Build prompt
    const prompt = buildPrompt(topic, questionCount);

    // Make LLM call with span tracking
    const { result: response, spanId } = await withSpan(
        trace,
        'cerebras-completion',
        'llm',
        async (span) => {
            const completion = await cerebras.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a rigorous academic examiner. Always respond with valid JSON only, no markdown formatting.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                model: CEREBRAS_CONFIG.model,
                stream: false,
                max_completion_tokens: CEREBRAS_CONFIG.maxCompletionTokens,
                temperature: CEREBRAS_CONFIG.temperature,
                top_p: CEREBRAS_CONFIG.topP,
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

    // Log metrics
    const tracker = getOpikTracker();
    tracker.logMetrics(trace.id, {
        latencyMs,
        model: CEREBRAS_CONFIG.model,
        tokenCount: totalTokens,
        promptVersion: 'v1.0',
    });

    console.log(
        `[ExamGenerator] Attempt ${attempt} completed in ${latencyMs}ms, ` +
        `tokens: ${totalTokens || 'unknown'}`
    );

    // Validate and transform response
    const questions = validateAndTransformResponse(content, questionCount);

    return questions;
}

/**
 * Categorizes errors into specific types
 */
function categorizeError(error: unknown): ExamGenerationError {
    if (error instanceof ExamGenerationException) {
        return error.error;
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('rate limit') || message.includes('429')) {
        return { type: 'RATE_LIMITED', message };
    }

    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        return { type: 'TIMEOUT', message };
    }

    if (message.includes('parse') || message.includes('Invalid') || message.includes('JSON')) {
        return { type: 'INVALID_RESPONSE', message };
    }

    return { type: 'API_ERROR', message };
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Exam Generator Service interface
 * Matches the design document specification
 */
export interface ExamGeneratorService {
    generateExam(topic: string, questionCount: number): Promise<ExamQuestion[]>;
}

/**
 * Creates an exam generator service instance
 */
export function createExamGeneratorService(): ExamGeneratorService {
    return {
        generateExam,
    };
}

// ============================================================================
// Exports
// ============================================================================

export {
    EXAM_GENERATION_PROMPT,
    RETRY_CONFIG,
    CEREBRAS_CONFIG,
    validateAndTransformResponse,
    buildPrompt,
};
