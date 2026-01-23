'use server';

/**
 * Grading Server Actions
 * Server-side actions for AI exam grading
 * Requirements: 5.1, 5.3, 5.4, 5.6
 */

import { auth } from '@clerk/nextjs/server';
import type { Exam, ExamAnswer, Database } from '../types/database';
import { createServiceClient } from '../services/supabase';
import { gradeExam as gradeExamService, type ExamGradeResult, GradingException } from '../services/exam-grader';

export interface GradingValidationError {
    field: string;
    message: string;
    code: string;
}

export interface GradingActionResult<T> {
    success: boolean;
    data?: T;
    errors?: GradingValidationError[];
}

type ExamUpdateData = Database['public']['Tables']['exams']['Update'];
type ExamAnswerUpdateData = Database['public']['Tables']['exam_answers']['Update'];

/**
 * Grade an exam using AI LLM-as-judge methodology
 */
export async function gradeExam(examId: string): Promise<GradingActionResult<ExamGradeResult>> {
    try {
        const { userId } = await auth();

        if (!userId) {
            return { success: false, errors: [{ field: 'auth', message: 'You must be signed in', code: 'unauthorized' }] };
        }

        if (!examId) {
            return { success: false, errors: [{ field: 'examId', message: 'Exam ID is required', code: 'invalid_input' }] };
        }

        const supabase = createServiceClient();

        const { data: examData, error: examError } = await supabase
            .from('exams')
            .select('*, commitments!inner(user_id)')
            .eq('id', examId)
            .single();

        if (examError || !examData) {
            return { success: false, errors: [{ field: 'examId', message: 'Exam not found', code: 'not_found' }] };
        }

        const examWithCommitment = examData as unknown as Exam & { commitments: { user_id: string } };

        if (examWithCommitment.commitments.user_id !== userId) {
            return { success: false, errors: [{ field: 'auth', message: 'Access denied', code: 'forbidden' }] };
        }

        if (examWithCommitment.status !== 'submitted') {
            return { success: false, errors: [{ field: 'exam', message: `Cannot grade exam with status: ${examWithCommitment.status}`, code: 'invalid_status' }] };
        }

        const { data: answersData } = await supabase.from('exam_answers').select('*').eq('exam_id', examId);
        const answers = (answersData || []) as ExamAnswer[];

        const exam: Exam = {
            id: examWithCommitment.id,
            commitment_id: examWithCommitment.commitment_id,
            questions: examWithCommitment.questions,
            status: examWithCommitment.status,
            started_at: examWithCommitment.started_at,
            submitted_at: examWithCommitment.submitted_at,
            overall_score: examWithCommitment.overall_score,
            passed: examWithCommitment.passed,
            opik_trace_id: examWithCommitment.opik_trace_id,
            created_at: examWithCommitment.created_at,
            updated_at: examWithCommitment.updated_at,
        };

        let gradeResult: ExamGradeResult;
        try {
            gradeResult = await gradeExamService(exam, answers);
        } catch (error) {
            console.error('[GradingActions] Grading failed:', error);
            await supabase.from('exams').update({ status: 'grading_failed' } as never).eq('id', examId);

            if (error instanceof GradingException) {
                return { success: false, errors: [{ field: 'grading', message: error.error.message, code: error.error.type.toLowerCase() }] };
            }
            return { success: false, errors: [{ field: 'grading', message: 'Grading failed', code: 'grading_failed' }] };
        }

        const examUpdateData: ExamUpdateData = {
            status: 'graded',
            overall_score: gradeResult.overallScore,
            passed: gradeResult.passed,
            opik_trace_id: gradeResult.opikTraceId,
        };

        await supabase.from('exams').update(examUpdateData as never).eq('id', examId);

        // Update each answer with grading results
        const questions = examWithCommitment.questions;
        const gradedAt = new Date().toISOString();

        for (let i = 0; i < answers.length; i++) {
            const answer = answers[i];
            const questionIndex = questions.findIndex(q => q.id === answer.question_id);
            const result = gradeResult.questionResults[questionIndex];

            if (result) {
                const answerUpdate: ExamAnswerUpdateData = {
                    score: result.score,
                    feedback: result.feedback,
                    graded_at: gradedAt,
                    opik_span_id: result.opikSpanId,
                };
                await supabase.from('exam_answers').update(answerUpdate as never).eq('id', answer.id);
            }
        }

        return { success: true, data: gradeResult };
    } catch (error) {
        console.error('[GradingActions] Unexpected error:', error);
        return { success: false, errors: [{ field: 'server', message: error instanceof Error ? error.message : 'Unexpected error', code: 'server_error' }] };
    }
}
