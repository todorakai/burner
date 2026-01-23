'use client';

/**
 * Commitment Detail Page
 * Shows details of a specific commitment
 */

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { CommitmentCard, CountdownTimer } from '@/features/burner/components/commitment';
import { getCommitmentById } from '@/features/burner/actions/commitment-actions';
import { getExamsByCommitmentId, generateExam } from '@/features/burner/actions/exam-actions';
import type { Commitment, Exam } from '@/features/burner/types/database';

export default function CommitmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [commitment, setCommitment] = useState<Commitment | null>(null);
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [commitmentData, examsData] = await Promise.all([
                getCommitmentById(id),
                getExamsByCommitmentId(id),
            ]);
            setCommitment(commitmentData);
            setExams(examsData);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load commitment');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleGenerateExam = async () => {
        setIsGenerating(true);
        try {
            const result = await generateExam(id);
            if (result.success && result.data) {
                toast.success('Exam generated!');
                router.push(`/dashboard/burner/exam/${result.data.id}`);
            } else {
                toast.error(result.errors?.[0]?.message || 'Failed to generate exam');
            }
        } catch (error) {
            console.error('Failed to generate exam:', error);
            toast.error('Failed to generate exam');
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!commitment) {
        return (
            <div className="p-6">
                <p>Commitment not found</p>
                <Link href="/dashboard/burner">
                    <Button variant="link">Back to Dashboard</Button>
                </Link>
            </div>
        );
    }

    const canTakeExam = commitment.status === 'active';
    const hasExam = exams.length > 0;
    const latestExam = exams[0];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/burner">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Commitment Details</h1>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <CommitmentCard commitment={commitment} showActions={false} />

                <Card>
                    <CardHeader>
                        <CardTitle>Time Remaining</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CountdownTimer deadline={commitment.deadline} />
                    </CardContent>
                </Card>
            </div>

            {canTakeExam && (
                <Card>
                    <CardHeader>
                        <CardTitle>Take Your Exam</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {hasExam && latestExam.status === 'pending' ? (
                            <div className="space-y-4">
                                <p>You have a pending exam ready to take.</p>
                                <Link href={`/dashboard/burner/exam/${latestExam.id}`}>
                                    <Button>
                                        <Play className="mr-2 h-4 w-4" />
                                        Continue to Exam
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p>Generate an AI exam to prove your learning on: <strong>{commitment.topic}</strong></p>
                                <Button onClick={handleGenerateExam} disabled={isGenerating}>
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="mr-2 h-4 w-4" />
                                            Generate Exam
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {exams.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Exam History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {exams.map((exam) => (
                                <div key={exam.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <p className="font-medium">Exam - {exam.status}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {exam.questions.length} questions
                                            {exam.overall_score !== null && ` • Score: ${exam.overall_score}%`}
                                        </p>
                                    </div>
                                    <Link href={`/dashboard/burner/exam/${exam.id}`}>
                                        <Button variant="outline" size="sm">View</Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
