'use client';

/**
 * Exam Results Page
 * Displays exam scores and per-question feedback after grading
 * Requirements: 5.2, 5.4
 */

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { ExamResults } from '@/features/burner/components/exam';
import { getExamById, getExamAnswers } from '@/features/burner/actions/exam-actions';
import { getCommitmentById } from '@/features/burner/actions/commitment-actions';
import type { Exam, Commitment, ExamAnswer } from '@/features/burner/types/database';

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [exam, setExam] = useState<Exam | null>(null);
    const [commitment, setCommitment] = useState<Commitment | null>(null);
    const [answers, setAnswers] = useState<ExamAnswer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const examData = await getExamById(id);
            if (!examData) {
                setError('Exam not found');
                return;
            }

            // Redirect if exam is not graded yet
            if (examData.status !== 'graded') {
                router.push(`/dashboard/burner/exam/${id}`);
                return;
            }

            setExam(examData);

            const [commitmentData, answersData] = await Promise.all([
                getCommitmentById(examData.commitment_id),
                getExamAnswers(id),
            ]);

            if (!commitmentData) {
                setError('Commitment not found');
                return;
            }

            setCommitment(commitmentData);
            setAnswers(answersData);
        } catch (err) {
            console.error('Failed to load exam results:', err);
            setError('Failed to load exam results');
        } finally {
            setIsLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading) {
        return (
            <div className="p-6 space-y-6 max-w-3xl mx-auto">
                {/* Score Card Skeleton */}
                <Card>
                    <CardHeader className="text-center pb-2">
                        <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
                        <Skeleton className="h-8 w-48 mx-auto mb-2" />
                        <Skeleton className="h-4 w-64 mx-auto" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center">
                            <Skeleton className="h-16 w-32 mx-auto mb-2" />
                            <Skeleton className="h-6 w-24 mx-auto" />
                        </div>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>

                {/* Statistics Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </CardContent>
                </Card>

                {/* Questions Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !exam || !commitment) {
        return (
            <div className="p-6 max-w-3xl mx-auto">
                <Card className="text-center py-12">
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            {error || 'Exam results not found'}
                        </p>
                        <Link href="/dashboard/burner">
                            <Button variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6">
            <ExamResults
                exam={exam}
                commitment={commitment}
                answers={answers}
            />
        </div>
    );
}
