'use client';

/**
 * Exam Results Component
 * Displays exam scores and per-question feedback
 * Requirements: 5.2, 5.4
 */

import { useMemo } from 'react';
import {
    CheckCircle2,
    XCircle,
    Trophy,
    Flame,
    DollarSign,
    FileQuestion,
    BookOpen,
    Lightbulb,
    MessageSquare,
    ArrowLeft,
    RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

import type {
    Exam,
    Commitment,
    ExamAnswer,
    ExamQuestion,
    QuestionType,
} from '../../types/database';

interface ExamResultsProps {
    /** The graded exam */
    exam: Exam;
    /** The associated commitment */
    commitment: Commitment;
    /** The graded answers */
    answers: ExamAnswer[];
    /** Optional className for styling */
    className?: string;
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Get question type icon
 */
function getQuestionTypeIcon(type: QuestionType) {
    switch (type) {
        case 'multiple_choice':
            return CheckCircle2;
        case 'short_answer':
            return FileQuestion;
        case 'application':
            return Lightbulb;
        default:
            return BookOpen;
    }
}

/**
 * Get question type label
 */
function getQuestionTypeLabel(type: QuestionType): string {
    switch (type) {
        case 'multiple_choice':
            return 'Multiple Choice';
        case 'short_answer':
            return 'Short Answer';
        case 'application':
            return 'Application';
        default:
            return 'Question';
    }
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
 * Get score background class based on score value
 */
function getScoreBgClass(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
}

/**
 * ExamResults - Displays exam scores and feedback
 *
 * Features:
 * - Overall score with pass/fail indication
 * - Stake status (saved/burned)
 * - Per-question scores and feedback
 * - Expandable question details
 * - Navigation back to dashboard
 * - Requirement 5.2: Score (0-100) and detailed feedback
 * - Requirement 5.4: Pass/fail based on 70% threshold
 */
export function ExamResults({
    exam,
    commitment,
    answers,
    className,
}: ExamResultsProps) {
    const passed = exam.passed ?? false;
    const overallScore = exam.overall_score ?? 0;
    const stakeSaved = commitment.stake_status === 'saved';
    const stakeBurned = commitment.stake_status === 'burned';
    const canRetry = !commitment.retry_used && !passed && commitment.status === 'active';

    // Map answers by question ID for easy lookup
    const answersByQuestionId = useMemo(() => {
        const map = new Map<string, ExamAnswer>();
        answers.forEach((answer) => map.set(answer.question_id, answer));
        return map;
    }, [answers]);

    // Calculate statistics
    const stats = useMemo(() => {
        const scores = answers.map((a) => a.score ?? 0);
        const highestScore = Math.max(...scores);
        const lowestScore = Math.min(...scores);
        const perfectScores = scores.filter((s) => s === 100).length;
        return { highestScore, lowestScore, perfectScores };
    }, [answers]);

    return (
        <div className={cn('max-w-3xl mx-auto space-y-6', className)}>
            {/* Overall Score Card */}
            <Card className={cn(
                'overflow-hidden',
                passed ? 'border-green-500/50' : 'border-red-500/50'
            )}>
                {/* Score Header */}
                <div className={cn(
                    'p-6 text-center',
                    passed
                        ? 'bg-gradient-to-b from-green-500/10 to-transparent'
                        : 'bg-gradient-to-b from-red-500/10 to-transparent'
                )}>
                    <div className={cn(
                        'mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full',
                        passed ? 'bg-green-500/20' : 'bg-red-500/20'
                    )}>
                        {passed ? (
                            <Trophy className="h-10 w-10 text-green-600 dark:text-green-400" />
                        ) : (
                            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                        )}
                    </div>

                    <h1 className="text-3xl font-bold mb-2">
                        {passed ? 'Congratulations!' : 'Not Quite There'}
                    </h1>
                    <p className="text-muted-foreground">
                        {passed
                            ? 'You passed the exam and saved your stake!'
                            : canRetry
                                ? 'You can retry the exam once more before the deadline.'
                                : 'Unfortunately, you did not pass the exam.'}
                    </p>
                </div>

                <CardContent className="pt-6">
                    {/* Score Display */}
                    <div className="text-center mb-6">
                        <div className={cn(
                            'text-6xl font-bold mb-2',
                            getScoreColorClass(overallScore)
                        )}>
                            {overallScore}%
                        </div>
                        <Badge
                            variant={passed ? 'default' : 'destructive'}
                            className="text-sm"
                        >
                            {passed ? 'PASSED' : 'FAILED'} (70% required)
                        </Badge>
                    </div>

                    {/* Score Progress Bar */}
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Score Progress</span>
                            <span className={getScoreColorClass(overallScore)}>
                                {overallScore}/100
                            </span>
                        </div>
                        <div className="relative">
                            <Progress
                                value={overallScore}
                                className={cn(
                                    'h-3',
                                    passed ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'
                                )}
                            />
                            {/* 70% threshold marker */}
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-foreground/50"
                                style={{ left: '70%' }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span className="relative -ml-4">70% (Pass)</span>
                            <span>100%</span>
                        </div>
                    </div>

                    <Separator className="my-6" />

                    {/* Stake Status */}
                    <div className={cn(
                        'rounded-lg p-4 flex items-center justify-between',
                        stakeSaved
                            ? 'bg-green-500/10 border border-green-500/30'
                            : stakeBurned
                                ? 'bg-red-500/10 border border-red-500/30'
                                : 'bg-orange-500/10 border border-orange-500/30'
                    )}>
                        <div className="flex items-center gap-3">
                            {stakeSaved ? (
                                <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                            ) : stakeBurned ? (
                                <Flame className="h-8 w-8 text-red-600 dark:text-red-400" />
                            ) : (
                                <DollarSign className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                            )}
                            <div>
                                <p className="font-semibold">
                                    {stakeSaved
                                        ? 'Stake Saved!'
                                        : stakeBurned
                                            ? 'Stake Burned'
                                            : 'Stake At Risk'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {stakeSaved
                                        ? 'Your commitment is complete'
                                        : stakeBurned
                                            ? 'Better luck next time'
                                            : canRetry
                                                ? 'You have one retry remaining'
                                                : 'Deadline approaching'}
                                </p>
                            </div>
                        </div>
                        <div className={cn(
                            'text-2xl font-bold',
                            stakeSaved
                                ? 'text-green-600 dark:text-green-400'
                                : stakeBurned
                                    ? 'text-red-600 dark:text-red-400 line-through'
                                    : 'text-orange-600 dark:text-orange-400'
                        )}>
                            {formatCurrency(commitment.stake_amount)}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex gap-3 pt-2">
                    <Link href="/dashboard/burner" className="flex-1">
                        <Button variant="outline" className="w-full">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
                    {canRetry && (
                        <Link href={`/dashboard/burner/commitment/${commitment.id}`} className="flex-1">
                            <Button className="w-full">
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Try Again
                            </Button>
                        </Link>
                    )}
                </CardFooter>
            </Card>

            {/* Statistics Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Exam Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="rounded-lg border p-3">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {stats.highestScore}%
                            </p>
                            <p className="text-xs text-muted-foreground">Highest Score</p>
                        </div>
                        <div className="rounded-lg border p-3">
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {stats.lowestScore}%
                            </p>
                            <p className="text-xs text-muted-foreground">Lowest Score</p>
                        </div>
                        <div className="rounded-lg border p-3">
                            <p className="text-2xl font-bold text-primary">
                                {stats.perfectScores}
                            </p>
                            <p className="text-xs text-muted-foreground">Perfect Answers</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Per-Question Feedback */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Question-by-Question Feedback
                    </CardTitle>
                    <CardDescription>
                        Review your answers and AI feedback for each question
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {exam.questions.map((question, index) => {
                            const answer = answersByQuestionId.get(question.id);
                            const score = answer?.score ?? 0;
                            const feedback = answer?.feedback ?? 'No feedback available';
                            const userAnswer = answer?.user_answer ?? 'No answer provided';
                            const TypeIcon = getQuestionTypeIcon(question.type);

                            return (
                                <AccordionItem
                                    key={question.id}
                                    value={question.id}
                                    className="border rounded-lg mb-3 last:mb-0"
                                >
                                    <AccordionTrigger className="px-4 hover:no-underline">
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <div className={cn(
                                                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold shrink-0',
                                                score >= 70
                                                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                                    : 'bg-red-500/20 text-red-600 dark:text-red-400'
                                            )}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate pr-4">
                                                    {question.question}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-xs gap-1">
                                                        <TypeIcon className="h-3 w-3" />
                                                        {getQuestionTypeLabel(question.type)}
                                                    </Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'text-xs',
                                                            score >= 70
                                                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30'
                                                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                                        )}
                                                    >
                                                        {score}%
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-4 pt-2">
                                            {/* Score Bar */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Score</span>
                                                    <span className={getScoreColorClass(score)}>
                                                        {score}/100
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={score}
                                                    className={cn(
                                                        'h-2',
                                                        `[&>div]:${getScoreBgClass(score)}`
                                                    )}
                                                />
                                            </div>

                                            {/* Your Answer */}
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Your Answer:</p>
                                                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                                                    {question.type === 'multiple_choice' ? (
                                                        <span>
                                                            <strong>{userAnswer}</strong>
                                                            {question.options && userAnswer && (
                                                                <span className="text-muted-foreground">
                                                                    {' - '}
                                                                    {question.options[userAnswer.charCodeAt(0) - 65]}
                                                                </span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <p className="whitespace-pre-wrap">{userAnswer}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Correct Answer (for multiple choice) */}
                                            {question.type === 'multiple_choice' && question.correct_answer && (
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                                        Correct Answer:
                                                    </p>
                                                    <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm">
                                                        <strong>{question.correct_answer}</strong>
                                                        {question.options && (
                                                            <span className="text-muted-foreground">
                                                                {' - '}
                                                                {question.options[question.correct_answer.charCodeAt(0) - 65]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* AI Feedback */}
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium flex items-center gap-2">
                                                    <MessageSquare className="h-4 w-4" />
                                                    AI Feedback:
                                                </p>
                                                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                                                    <p className="whitespace-pre-wrap">{feedback}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </CardContent>
            </Card>

            {/* Topic Summary */}
            <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Exam Topic
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="font-medium">{commitment.topic}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Completed on {new Date(exam.submitted_at ?? exam.updated_at).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
