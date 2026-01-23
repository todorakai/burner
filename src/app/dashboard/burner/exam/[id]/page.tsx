'use client';

/**
 * Exam Page
 * Handles the exam taking experience
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { ExamStart, ExamQuestion, ExamProgress, ExamTimer } from '@/features/burner/components/exam';
import {
    getExamById,
    startExam,
    submitAnswer,
    submitExam,
    getExamAnswers,
} from '@/features/burner/actions/exam-actions';
import { getCommitmentById } from '@/features/burner/actions/commitment-actions';
import { gradeExam } from '@/features/burner/actions/grading-actions';
import type { Exam, Commitment, ExamAnswer } from '@/features/burner/types/database';

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [exam, setExam] = useState<Exam | null>(null);
    const [commitment, setCommitment] = useState<Commitment | null>(null);
    const [answers, setAnswers] = useState<Map<string, string>>(new Map());
    const [savedAnswers, setSavedAnswers] = useState<ExamAnswer[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGrading, setIsGrading] = useState(false);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const examData = await getExamById(id);
            if (!examData) {
                toast.error('Exam not found');
                return;
            }
            setExam(examData);

            const [commitmentData, answersData] = await Promise.all([
                getCommitmentById(examData.commitment_id),
                getExamAnswers(id),
            ]);
            setCommitment(commitmentData);
            setSavedAnswers(answersData);

            // Load saved answers into state
            const answerMap = new Map<string, string>();
            answersData.forEach((a) => answerMap.set(a.question_id, a.user_answer));
            setAnswers(answerMap);
        } catch (error) {
            console.error('Failed to load exam:', error);
            toast.error('Failed to load exam');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Navigation warning
    useEffect(() => {
        if (exam?.status === 'in_progress') {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [exam?.status]);

    const handleStartExam = async () => {
        setIsStarting(true);
        try {
            const result = await startExam(id);
            if (result.success && result.data) {
                setExam(result.data);
                toast.success('Exam started!');
            } else {
                toast.error(result.errors?.[0]?.message || 'Failed to start exam');
            }
        } catch (error) {
            console.error('Failed to start exam:', error);
            toast.error('Failed to start exam');
        } finally {
            setIsStarting(false);
        }
    };

    const handleAnswerChange = async (answer: string) => {
        if (!exam) return;
        const question = exam.questions[currentQuestionIndex];

        // Update local state immediately
        setAnswers((prev) => new Map(prev).set(question.id, answer));

        // Save to server
        try {
            await submitAnswer(id, question.id, answer);
        } catch (error) {
            console.error('Failed to save answer:', error);
        }
    };

    const handleSubmitExam = async () => {
        setIsSubmitting(true);
        try {
            const result = await submitExam(id);
            if (result.success && result.data) {
                setExam(result.data);
                setShowSubmitDialog(false);
                toast.success('Exam submitted! Grading in progress...');

                // Start grading
                setIsGrading(true);
                const gradeResult = await gradeExam(id);
                if (gradeResult.success && gradeResult.data) {
                    toast.success(`Exam graded! Score: ${gradeResult.data.overallScore}%`);
                    router.push(`/dashboard/burner/exam/${id}/results`);
                } else {
                    toast.error(gradeResult.errors?.[0]?.message || 'Grading failed');
                    loadData();
                }
            } else {
                toast.error(result.errors?.[0]?.message || 'Failed to submit exam');
            }
        } catch (error) {
            console.error('Failed to submit exam:', error);
            toast.error('Failed to submit exam');
        } finally {
            setIsSubmitting(false);
            setIsGrading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!exam || !commitment) {
        return (
            <div className="p-6">
                <p>Exam not found</p>
                <Link href="/dashboard/burner">
                    <Button variant="link">Back to Dashboard</Button>
                </Link>
            </div>
        );
    }

    // Show grading screen
    if (isGrading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <CardTitle>Grading Your Exam</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                        <p className="text-muted-foreground">
                            Our AI is evaluating your answers...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show start screen for pending exams
    if (exam.status === 'pending') {
        return (
            <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <Link href={`/dashboard/burner/commitment/${commitment.id}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Exam</h1>
                </div>
                <ExamStart
                    exam={exam}
                    commitment={commitment}
                    onStart={handleStartExam}
                    isStarting={isStarting}
                />
            </div>
        );
    }

    // Show results link for graded exams
    if (exam.status === 'graded') {
        router.push(`/dashboard/burner/exam/${id}/results`);
        return null;
    }

    // Exam in progress
    const currentQuestion = exam.questions[currentQuestionIndex];
    const currentAnswer = answers.get(currentQuestion.id) || '';
    const answeredIndices = exam.questions
        .map((q, i) => (answers.has(q.id) && answers.get(q.id)!.trim() ? i : -1))
        .filter((i) => i >= 0);
    const allAnswered = answeredIndices.length === exam.questions.length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold truncate max-w-md">{commitment.topic}</h1>
                </div>
                {exam.started_at && <ExamTimer startedAt={exam.started_at} compact />}
            </div>

            {/* Progress */}
            <ExamProgress
                currentQuestion={currentQuestionIndex}
                totalQuestions={exam.questions.length}
                answeredQuestions={answeredIndices}
            />

            {/* Question */}
            <ExamQuestion
                question={currentQuestion}
                questionNumber={currentQuestionIndex + 1}
                value={currentAnswer}
                onChange={handleAnswerChange}
            />

            {/* Navigation */}
            <Card>
                <CardFooter className="flex justify-between pt-6">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                        disabled={currentQuestionIndex === 0}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Previous
                    </Button>

                    <div className="flex gap-2">
                        {currentQuestionIndex < exam.questions.length - 1 ? (
                            <Button
                                onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                            >
                                Next
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setShowSubmitDialog(true)}
                                disabled={!allAnswered}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Submit Exam
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </Card>

            {/* Submit Confirmation Dialog */}
            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have answered all {exam.questions.length} questions.
                            Once submitted, you cannot change your answers.
                            Your exam will be graded by AI.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Review Answers</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmitExam} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
