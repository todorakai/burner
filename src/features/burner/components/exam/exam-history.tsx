'use client';

/**
 * Exam History Component
 * Displays a list of past exams with scores, dates, and pass/fail status
 * Requirements: 7.3
 */

import { useMemo } from 'react';
import Link from 'next/link';
import {
    CheckCircle2,
    XCircle,
    Calendar,
    Trophy,
    FileText,
    ExternalLink,
    History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import type { Exam, Commitment } from '../../types/database';

interface ExamHistoryProps {
    /** Array of graded exams to display */
    exams: Exam[];
    /** Map of commitment IDs to commitment objects for topic lookup */
    commitments: Map<string, Commitment>;
    /** Optional className for styling */
    className?: string;
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/**
 * Format time for display
 */
function formatTime(dateString: string | null): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * Get score color class based on score value
 */
function getScoreColorClass(score: number): string {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
}

/**
 * ExamHistory - Displays a list of past exams
 *
 * Features:
 * - Table view of all graded exams
 * - Shows exam date, topic, score, and pass/fail status
 * - Links to detailed exam results
 * - Empty state when no exams exist
 * - Requirement 7.3: Display exam history with scores and feedback
 */
export function ExamHistory({
    exams,
    commitments,
    className,
}: ExamHistoryProps) {
    // Filter to only show graded exams and sort by date (newest first)
    const gradedExams = useMemo(() => {
        return exams
            .filter((exam) => exam.status === 'graded' && exam.overall_score !== null)
            .sort((a, b) => {
                const dateA = new Date(a.submitted_at ?? a.updated_at).getTime();
                const dateB = new Date(b.submitted_at ?? b.updated_at).getTime();
                return dateB - dateA;
            });
    }, [exams]);

    // Calculate summary statistics
    const stats = useMemo(() => {
        const total = gradedExams.length;
        const passed = gradedExams.filter((e) => e.passed).length;
        const failed = total - passed;
        const avgScore =
            total > 0
                ? Math.round(
                    gradedExams.reduce((sum, e) => sum + (e.overall_score ?? 0), 0) /
                    total
                )
                : 0;
        return { total, passed, failed, avgScore };
    }, [gradedExams]);

    // Empty state
    if (gradedExams.length === 0) {
        return (
            <Card className={cn('', className)}>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                        <History className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Exam History</h3>
                    <p className="text-muted-foreground text-center max-w-sm">
                        You haven&apos;t completed any exams yet. Take an exam on one of
                        your commitments to see your history here.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('', className)}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Exam History
                        </CardTitle>
                        <CardDescription>
                            Your past exam results and performance
                        </CardDescription>
                    </div>
                    {/* Summary Stats */}
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="font-medium">{stats.passed}</span>
                            <span className="text-muted-foreground">passed</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="font-medium">{stats.failed}</span>
                            <span className="text-muted-foreground">failed</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5">
                            <span className="text-muted-foreground">Avg:</span>
                            <span className={cn('font-medium', getScoreColorClass(stats.avgScore))}>
                                {stats.avgScore}%
                            </span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Topic</TableHead>
                            <TableHead className="text-center">Score</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {gradedExams.map((exam) => {
                            const commitment = commitments.get(exam.commitment_id);
                            const topic = commitment?.topic ?? 'Unknown Topic';
                            const score = exam.overall_score ?? 0;
                            const passed = exam.passed ?? false;
                            const examDate = exam.submitted_at ?? exam.updated_at;

                            return (
                                <TableRow key={exam.id}>
                                    {/* Date Column */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">
                                                    {formatDate(examDate)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatTime(examDate)}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Topic Column */}
                                    <TableCell>
                                        <p className="font-medium truncate max-w-[200px]" title={topic}>
                                            {topic}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {exam.questions.length} questions
                                        </p>
                                    </TableCell>

                                    {/* Score Column */}
                                    <TableCell className="text-center">
                                        <span
                                            className={cn(
                                                'text-lg font-bold',
                                                getScoreColorClass(score)
                                            )}
                                        >
                                            {score}%
                                        </span>
                                    </TableCell>

                                    {/* Status Column */}
                                    <TableCell className="text-center">
                                        <Badge
                                            variant={passed ? 'default' : 'destructive'}
                                            className={cn(
                                                'gap-1',
                                                passed
                                                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/20'
                                                    : ''
                                            )}
                                        >
                                            {passed ? (
                                                <>
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Passed
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="h-3 w-3" />
                                                    Failed
                                                </>
                                            )}
                                        </Badge>
                                    </TableCell>

                                    {/* Actions Column */}
                                    <TableCell className="text-right">
                                        <Link href={`/dashboard/burner/exam/${exam.id}/results`}>
                                            <Button variant="ghost" size="sm" className="gap-1">
                                                View Details
                                                <ExternalLink className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

/**
 * Compact version of ExamHistory for smaller spaces
 */
export function ExamHistoryCompact({
    exams,
    commitments,
    className,
    maxItems = 5,
}: ExamHistoryProps & { maxItems?: number }) {
    // Filter to only show graded exams and sort by date (newest first)
    const gradedExams = useMemo(() => {
        return exams
            .filter((exam) => exam.status === 'graded' && exam.overall_score !== null)
            .sort((a, b) => {
                const dateA = new Date(a.submitted_at ?? a.updated_at).getTime();
                const dateB = new Date(b.submitted_at ?? b.updated_at).getTime();
                return dateB - dateA;
            })
            .slice(0, maxItems);
    }, [exams, maxItems]);

    // Empty state
    if (gradedExams.length === 0) {
        return (
            <Card className={cn('', className)}>
                <CardContent className="flex flex-col items-center justify-center py-8">
                    <History className="h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No exam history yet</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('', className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Exams
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {gradedExams.map((exam) => {
                    const commitment = commitments.get(exam.commitment_id);
                    const topic = commitment?.topic ?? 'Unknown Topic';
                    const score = exam.overall_score ?? 0;
                    const passed = exam.passed ?? false;
                    const examDate = exam.submitted_at ?? exam.updated_at;

                    return (
                        <Link
                            key={exam.id}
                            href={`/dashboard/burner/exam/${exam.id}/results`}
                            className="block"
                        >
                            <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className={cn(
                                            'flex h-8 w-8 items-center justify-center rounded-full shrink-0',
                                            passed
                                                ? 'bg-green-500/20'
                                                : 'bg-red-500/20'
                                        )}
                                    >
                                        {passed ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate text-sm">{topic}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(examDate)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span
                                        className={cn(
                                            'font-bold',
                                            getScoreColorClass(score)
                                        )}
                                    >
                                        {score}%
                                    </span>
                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {/* View All Link */}
                {exams.filter((e) => e.status === 'graded').length > maxItems && (
                    <Link
                        href="/dashboard/burner/history"
                        className="block text-center text-sm text-primary hover:underline pt-2"
                    >
                        View all exams →
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}
