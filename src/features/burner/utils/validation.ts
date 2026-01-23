/**
 * Burner Feature Validation Schemas
 * Zod schemas for input validation
 * Requirements: 2.1, 2.3, 2.4, 2.5
 */

import { z } from 'zod';

// ============================================================================
// COMMITMENT VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for creating a new learning commitment
 * Validates topic, stake amount, and duration according to requirements
 *
 * Requirements:
 * - 2.1: Require topic, duration (days), and stake amount
 * - 2.3: Reject empty topic
 * - 2.4: Duration must be 1-90 days
 * - 2.5: Stake amount must be $1-$1000
 */
export const createCommitmentSchema = z.object({
    topic: z
        .string()
        .min(3, 'Topic must be at least 3 characters')
        .max(200, 'Topic must be less than 200 characters'),
    stakeAmount: z
        .number()
        .min(1, 'Minimum stake is $1')
        .max(1000, 'Maximum stake is $1000'),
    durationDays: z
        .number()
        .int('Duration must be a whole number')
        .min(1, 'Minimum duration is 1 day')
        .max(90, 'Maximum duration is 90 days'),
});

/**
 * Type inferred from createCommitmentSchema
 */
export type CreateCommitmentInput = z.infer<typeof createCommitmentSchema>;

// ============================================================================
// EXAM VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for submitting an answer to an exam question
 */
export const submitAnswerSchema = z.object({
    examId: z.string().uuid('Invalid exam ID'),
    questionId: z.string().uuid('Invalid question ID'),
    answer: z.string().min(1, 'Answer cannot be empty'),
});

/**
 * Type inferred from submitAnswerSchema
 */
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

/**
 * Schema for validating exam question structure
 */
export const examQuestionSchema = z.object({
    id: z.string(),
    type: z.enum(['multiple_choice', 'short_answer', 'application']),
    question: z.string().min(1, 'Question cannot be empty'),
    options: z.array(z.string()).optional(),
    correct_answer: z.string().optional(),
    difficulty: z.enum(['intermediate', 'advanced']),
});

/**
 * Type inferred from examQuestionSchema
 */
export type ExamQuestionInput = z.infer<typeof examQuestionSchema>;

/**
 * Schema for validating a complete exam structure
 */
export const examSchema = z.object({
    id: z.string().uuid('Invalid exam ID'),
    commitment_id: z.string().uuid('Invalid commitment ID'),
    questions: z
        .array(examQuestionSchema)
        .min(5, 'Exam must have at least 5 questions')
        .max(10, 'Exam must have at most 10 questions'),
    status: z.enum([
        'pending',
        'in_progress',
        'submitted',
        'graded',
        'grading_failed',
    ]),
});

/**
 * Type inferred from examSchema
 */
export type ExamInput = z.infer<typeof examSchema>;

// ============================================================================
// GRADING VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for validating a grade result from the LLM
 */
export const gradeResultSchema = z.object({
    score: z
        .number()
        .min(0, 'Score must be at least 0')
        .max(100, 'Score must be at most 100'),
    feedback: z.string().min(1, 'Feedback cannot be empty'),
});

/**
 * Type inferred from gradeResultSchema
 */
export type GradeResultInput = z.infer<typeof gradeResultSchema>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates commitment creation input and returns typed result
 * @param input - Raw input to validate
 * @returns Validation result with success flag and data or errors
 */
export function validateCommitmentInput(input: unknown): {
    success: boolean;
    data?: CreateCommitmentInput;
    errors?: z.ZodError;
} {
    const result = createCommitmentSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}

/**
 * Validates answer submission input and returns typed result
 * @param input - Raw input to validate
 * @returns Validation result with success flag and data or errors
 */
export function validateAnswerInput(input: unknown): {
    success: boolean;
    data?: SubmitAnswerInput;
    errors?: z.ZodError;
} {
    const result = submitAnswerSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}

/**
 * Validates exam structure and returns typed result
 * @param input - Raw input to validate
 * @returns Validation result with success flag and data or errors
 */
export function validateExamInput(input: unknown): {
    success: boolean;
    data?: ExamInput;
    errors?: z.ZodError;
} {
    const result = examSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}

/**
 * Validates grade result from LLM and returns typed result
 * @param input - Raw input to validate
 * @returns Validation result with success flag and data or errors
 */
export function validateGradeResult(input: unknown): {
    success: boolean;
    data?: GradeResultInput;
    errors?: z.ZodError;
} {
    const result = gradeResultSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}
