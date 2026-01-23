'use server';

/**
 * Exam Server Actions
 * Server-side actions for managing AI-generated exams
 * Requirements: 3.1, 4.2, 4.3
 */

import { auth } from '@clerk/nextjs/server';
import type {
    Exam,
    ExamAnswer,
    ExamQuestion,
    Commitment,
    Database,
} from '../types/database';
import { createServiceClient } from '../services/supabase';
import { generateExam as generateExamQuestions } from '../services/exam-generator';

/**
 * Validation error structure
 */
export interface ExamValidationError {
    field: string;
    message: string;
    code: string;
}

/**
 * Action result type for exam server actions
 */
export interface ExamActionResult<T> {
    success: boolean;
    data?: T;
    errors?: ExamValidationError[];
}

// Type aliases for database operations
type ExamInsertData = Database['public']['Tables']['exams']['Insert'];
type ExamUpdateData = Database['public']['Tables']['exams']['Update'];
type ExamAnswerInsertData = Database['public']['Tables']['exam_answers']['Insert'];
type ExamAnswerUpdateData = Database['public']['Tables']['exam_answers']['Update'];

/**
 * Generate an AI exam for a commitment
 * Requirements: 3.1 - Generate 5-10 questions based on learning topic
 */
export async function generateExam(
    commitmentId: string
): Promise<ExamActionResult<Exam>> {
    try {
        const { userId } = await auth();

        if (!userId) {
            return {
                success: false,
                errors: [{ field: 'auth', message: 'You must be signed in', code: 'unauthorized' }],
            };
        }

        if (!commitmentId) {
            return {
                success: false,
                errors: [{ field: 'commitmentId', message: 'Commitment ID is required', code: 'invalid_input' }],
            };
        }

        const supabase = createServiceClient();

        const { data: commitmentData, error: commitmentError } = await supabase
            .from('commitments')
            .select('*')
            .eq('id', commitmentId)
            .single();

        if (commitmentError || !commitmentData) {
            return {
                success: false,
                errors: [{ field: 'commitmentId', message: 'Commitment not found', code: 'not_found' }],
            };
        }

        const commitment = commitmentData as Commitment;

        if (commitment.user_id !== userId) {
            return {
                success: false,
                errors: [{ field: 'auth', message: 'Access denied', code: 'forbidden' }],
            };
        }

        if (commitment.status !== 'active') {
            return {
                success: false,
                errors: [{ field: 'commitment', message: `Cannot generate exam for ${commitment.status} commitment`, code: 'invalid_status' }],
            };
        }

        if (new Date(commitment.deadline) < new Date()) {
            return {
                success: false,
                errors: [{ field: 'commitment', message: 'Deadline has passed', code: 'deadline_passed' }],
            };
        }

        const questions = await generateExamQuestions(commitment.topic, 7);

        const examInsert: ExamInsertData = {
            commitment_id: commitmentId,
            questions: questions,
            status: 'pending',
        };

        const { data: examData, error: examError } = await supabase
            .from('exams')
            .insert(examInsert as never)
            .select()
            .single();

        if (examError || !examData) {
            return {
                success: false,
                errors: [{ field: 'server', message: 'Failed to create exam', code: 'database_error' }],
            };
        }

        return { success: true, data: examData as Exam };
    } catch (error) {
        console.error('Error generating exam:', error);
        return {
            success: false,
            errors: [{ field: 'server', message: error instanceof Error ? error.message : 'Unexpected error', code: 'server_error' }],
        };
    }
}


/**
 * Start an exam - updates status to 'in_progress' and sets started_at
 */
export async function startExam(examId: string): Promise<ExamActionResult<Exam>> {
    try {
        const { userId } = await auth();

        if (!userId) {
            return {
                success: false,
                errors: [{ field: 'auth', message: 'You must be signed in', code: 'unauthorized' }],
            };
        }

        const supabase = createServiceClient();

        const { data: examData, error: examError } = await supabase
            .from('exams')
            .select('*, commitments!inner(user_id)')
            .eq('id', examId)
            .single();

        if (examError || !examData) {
            return {
                success: false,
                errors: [{ field: 'examId', message: 'Exam not found', code: 'not_found' }],
            };
        }

        const examWithCommitment = examData as unknown as Exam & { commitments: { user_id: string } };

        if (examWithCommitment.commitments.user_id !== userId) {
            return {
                success: false,
                errors: [{ field: 'auth', message: 'Access denied', code: 'forbidden' }],
            };
        }

        if (examWithCommitment.status !== 'pending') {
            return {
                success: false,
                errors: [{ field: 'exam', message: `Cannot start exam with status: ${examWithCommitment.status}`, code: 'invalid_status' }],
            };
        }

        const updateData: ExamUpdateData = {
            status: 'in_progress',
            started_at: new Date().toISOString(),
        };

        const { data: updatedExam, error: updateError } = await supabase
            .from('exams')
            .update(updateData as never)
            .eq('id', examId)
            .select()
            .single();

        if (updateError || !updatedExam) {
            return {
                success: false,
                errors: [{ field: 'server', message: 'Failed to start exam', code: 'database_error' }],
            };
        }

        return { success: true, data: updatedExam as Exam };
    } catch (error) {
        console.error('Error starting exam:', error);
        return {
            success: false,
            errors: [{ field: 'server', message: error instanceof Error ? error.message : 'Unexpected error', code: 'server_error' }],
        };
    }
}

/**
 * Submit an answer for an exam question
 */
export async function submitAnswer(
    examId: string,
    questionId: string,
    answer: string
): Promise<ExamActionResult<ExamAnswer>> {
    try {
        const { userId } = await auth();

        if (!userId) {
            return {
                success: false,
                errors: [{ field: 'auth', message: 'You must be signed in', code: 'unauthorized' }],
            };
        }

        if (!answer?.trim()) {
            return {
                success: false,
                errors: [{ field: 'answer', message: 'Answer cannot be empty', code: 'invalid_input' }],
            };
        }

        const supabase = createServiceClient();

        const { data: examData, error: examError } = await supabase
            .from('exams')
            .select('*, commitments!inner(user_id)')
            .eq('id', examId)
            .single();

        if (examError || !examData) {
            return {
                success: false,
                errors: [{ field: 'examId', message: 'Exam not found', code: 'not_found' }],
            };
        }

        const examWithCommitment = examData as unknown as Exam & { commitments: { user_id: string } };

        if (examWithCommitment.commitments.user_id !== userId) {
            return {
                success: false,
                errors: [{ field: 'auth', message: 'Access denied', code: 'forbidden' }],
            };
        }

        if (examWithCommitment.status !== 'in_progress') {
            return {
                success: false,
                errors: [{ field: 'exam', message: 'Exam is not in progress', code: 'invalid_status' }],
            };
        }

        const questions = examWithCommitment.questions as ExamQuestion[];
        if (!questions.some(q => q.id === questionId)) {
            return {
                success: false,
                errors: [{ field: 'questionId', message: 'Question not found', code: 'not_found' }],
            };
        }

        // Check for existing answer
        const { data: existingAnswer } = await supabase
            .from('exam_answers')
            .select('id')
            .eq('exam_id', examId)
            .eq('question_id', questionId)
            .single();

        if (existingAnswer) {
            const { data: updated, error: updateError } = await supabase
                .from('exam_answers')
                .update({ user_answer: answer.trim() } as never)
                .eq('id', (existingAnswer as { id: string }).id)
                .select()
                .single();

            if (updateError || !updated) {
                return {
                    success: false,
                    errors: [{ field: 'server', message: 'Failed to update answer', code: 'database_error' }],
                };
            }
            return { success: true, data: updated as ExamAnswer };
        }

        const answerInsert: ExamAnswerInsertData = {
            exam_id: examId,
            question_id: questionId,
            user_answer: answer.trim(),
        };

        const { data: newAnswer, error: insertError } = await supabase
            .from('exam_answers')
            .insert(answerInsert as never)
            .select()
            .single();

        if (insertError || !newAnswer) {
            return {
                success: false,
                errors: [{ field: 'server', message: 'Failed to submit answer', code: 'database_error' }],
            };
        }

        return { success: true, data: newAnswer as ExamAnswer };
    } catch (error) {
        console.error('Error submitting answer:', error);
        return {
            success: false,
            errors: [{ field: 'server', message: error instanceof Error ? error.message : 'Unexpected error', code: 'server_error' }],
        };
    }
}


/**
 * Submit an exam for grading
 */
export async function submitExam(examId: string): Promise<ExamActionResult<Exam>> {
    try {
        const { userId } = await auth();

        if (!userId) {
            return {
                success: false,
                errors: [{ field: 'auth', message: 'You must be signed in', code: 'unauthorized' }],
            };
        }

        const supabase = createServiceClient();

        const { data: examData, error: examError } = await supabase
            .from('exams')
            .select('*, commitments!inner(user_id)')
            .eq('id', examId)
            .single();

        if (examError || !examData) {
            return {
                success: false,
                errors: [{ field: 'examId', message: 'Exam not found', code: 'not_found' }],
            };
        }

        const examWithCommitment = examData as unknown as Exam & { commitments: { user_id: string } };

        if (examWithCommitment.commitments.user_id !== userId) {
            return {
                success: false,
                errors: [{ field: 'auth', message: 'Access denied', code: 'forbidden' }],
            };
        }

        if (examWithCommitment.status !== 'in_progress') {
            return {
                success: false,
                errors: [{ field: 'exam', message: 'Exam is not in progress', code: 'invalid_status' }],
            };
        }

        // Check all questions answered
        const { data: answers } = await supabase
            .from('exam_answers')
            .select('question_id')
            .eq('exam_id', examId);

        const questions = examWithCommitment.questions as ExamQuestion[];
        const answeredIds = new Set((answers || []).map((a: { question_id: string }) => a.question_id));
        const unanswered = questions.filter(q => !answeredIds.has(q.id));

        if (unanswered.length > 0) {
            return {
                success: false,
                errors: [{ field: 'exam', message: `${unanswered.length} question(s) unanswered`, code: 'incomplete_exam' }],
            };
        }

        const updateData: ExamUpdateData = {
            status: 'submitted',
            submitted_at: new Date().toISOString(),
        };

        const { data: updatedExam, error: updateError } = await supabase
            .from('exams')
            .update(updateData as never)
            .eq('id', examId)
            .select()
            .single();

        if (updateError || !updatedExam) {
            return {
                success: false,
                errors: [{ field: 'server', message: 'Failed to submit exam', code: 'database_error' }],
            };
        }

        return { success: true, data: updatedExam as Exam };
    } catch (error) {
        console.error('Error submitting exam:', error);
        return {
            success: false,
            errors: [{ field: 'server', message: error instanceof Error ? error.message : 'Unexpected error', code: 'server_error' }],
        };
    }
}

/**
 * Get an exam by ID
 */
export async function getExamById(examId: string): Promise<Exam | null> {
    try {
        const { userId } = await auth();
        if (!userId) return null;

        const supabase = createServiceClient();

        const { data, error } = await supabase
            .from('exams')
            .select('*, commitments!inner(user_id)')
            .eq('id', examId)
            .single();

        if (error || !data) return null;

        const examWithCommitment = data as unknown as Exam & { commitments: { user_id: string } };
        if (examWithCommitment.commitments.user_id !== userId) return null;

        const { commitments: _, ...exam } = examWithCommitment;
        return exam as Exam;
    } catch {
        return null;
    }
}

/**
 * Get all exams for a commitment
 */
export async function getExamsByCommitmentId(commitmentId: string): Promise<Exam[]> {
    try {
        const { userId } = await auth();
        if (!userId) return [];

        const supabase = createServiceClient();

        const { data: commitment } = await supabase
            .from('commitments')
            .select('user_id')
            .eq('id', commitmentId)
            .single();

        if (!commitment || (commitment as { user_id: string }).user_id !== userId) return [];

        const { data: exams } = await supabase
            .from('exams')
            .select('*')
            .eq('commitment_id', commitmentId)
            .order('created_at', { ascending: false });

        return (exams || []) as Exam[];
    } catch {
        return [];
    }
}

/**
 * Get all answers for an exam
 */
export async function getExamAnswers(examId: string): Promise<ExamAnswer[]> {
    try {
        const { userId } = await auth();
        if (!userId) return [];

        const supabase = createServiceClient();

        const { data: exam } = await supabase
            .from('exams')
            .select('*, commitments!inner(user_id)')
            .eq('id', examId)
            .single();

        if (!exam) return [];

        const examWithCommitment = exam as unknown as Exam & { commitments: { user_id: string } };
        if (examWithCommitment.commitments.user_id !== userId) return [];

        const { data: answers } = await supabase
            .from('exam_answers')
            .select('*')
            .eq('exam_id', examId)
            .order('created_at', { ascending: true });

        return (answers || []) as ExamAnswer[];
    } catch {
        return [];
    }
}
