'use client';

/**
 * Exam Start Component
 * Pre-exam screen showing topic, question count, stake amount with "Start Exam" button
 * Requirements: 4.1
 */

import { useState } from 'react';
import {
    BookOpen,
    DollarSign,
    Clock,
    AlertTriangle,
    FileQuestion,
    Play,
    Loader2,
    CheckCircle2,
    Info,
} from 'lucide-react';
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
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';

import type { Exam, Commitment } from '../../types/database';

interface ExamStartProps {
    /** The exam to start */
    exam: Exam;
    /** The associated commitment */
    commitment: Commitment;
    /** Callback when "Start Exam" is clicked */
    onStart: () => Promise<void>;
    /** Whether the exam is currently starting */
    isStarting?: boolean;
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
 * Get question type counts from exam
 */
function getQuestionTypeCounts(exam: Exam): {
    multipleChoice: number;
    shortAnswer: number;
    application: number;
} {
    const counts = {
        multipleChoice: 0,
        shortAnswer: 0,
        application: 0,
    };

    for (const question of exam.questions) {
        switch (question.type) {
            case 'multiple_choice':
                counts.multipleChoice++;
                break;
            case 'short_answer':
                counts.shortAnswer++;
                break;
            case 'application':
                counts.application++;
                break;
        }
    }

    return counts;
}

/**
 * ExamStart - Pre-exam screen
 *
 * Features:
 * - Displays topic being tested
 * - Shows question count and types
 * - Displays stake amount at risk
 * - Important instructions and warnings
 * - Start Exam button
 * - Requirement 4.1: Display questions one at a time with progress indicator
 */
export function ExamStart({
    exam,
    commitment,
    onStart,
    isStarting = false,
    className,
}: ExamStartProps) {
    const [hasAcknowledged, setHasAcknowledged] = useState(false);
    const questionCounts = getQuestionTypeCounts(exam);
    const totalQuestions = exam.questions.length;

    const handleStart = async () => {
        if (!hasAcknowledged) {
            setHasAcknowledged(true);
            return;
        }
        await onStart();
    };

    return (
        <div className={cn('max-w-2xl mx-auto space-y-6', className)}>
            {/* Main Exam Card */}
            <Card>
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Ready to Prove Your Learning?</CardTitle>
                    <CardDescription className="text-base">
                        Complete this exam to save your stake
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Topic */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="flex items-start gap-3">
                            <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Topic</p>
                                <p className="text-lg font-semibold">{commitment.topic}</p>
                            </div>
                        </div>
                    </div>

                    {/* Exam Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Question Count */}
                        <div className="rounded-lg border p-4">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <FileQuestion className="h-4 w-4" />
                                <span className="text-sm font-medium">Questions</span>
                            </div>
                            <p className="text-2xl font-bold">{totalQuestions}</p>
                        </div>

                        {/* Stake Amount */}
                        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
                            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-sm font-medium">At Stake</span>
                            </div>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {formatCurrency(commitment.stake_amount)}
                            </p>
                        </div>
                    </div>

                    {/* Question Types Breakdown */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Question Types</p>
                        <div className="flex flex-wrap gap-2">
                            {questionCounts.multipleChoice > 0 && (
                                <Badge variant="outline" className="gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {questionCounts.multipleChoice} Multiple Choice
                                </Badge>
                            )}
                            {questionCounts.shortAnswer > 0 && (
                                <Badge variant="outline" className="gap-1">
                                    <FileQuestion className="h-3 w-3" />
                                    {questionCounts.shortAnswer} Short Answer
                                </Badge>
                            )}
                            {questionCounts.application > 0 && (
                                <Badge variant="outline" className="gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {questionCounts.application} Application
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Passing Score Info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Info className="h-4 w-4" />
                        <span>You need <strong className="text-foreground">70%</strong> or higher to pass and save your stake</span>
                    </div>
                </CardContent>

                <CardFooter className="flex-col gap-4 pt-2">
                    {/* Warning Alert */}
                    <Alert variant="destructive" className="bg-destructive/5">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                            Once you start the exam, you cannot pause or restart. Make sure you have
                            enough time to complete all questions. Navigating away may result in
                            losing your progress.
                        </AlertDescription>
                    </Alert>

                    {/* Start Button */}
                    <Button
                        size="lg"
                        className="w-full"
                        onClick={handleStart}
                        disabled={isStarting}
                    >
                        {isStarting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Starting Exam...
                            </>
                        ) : hasAcknowledged ? (
                            <>
                                <Play className="mr-2 h-5 w-5" />
                                Start Exam Now
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-5 w-5" />
                                I&apos;m Ready - Continue
                            </>
                        )}
                    </Button>

                    {!hasAcknowledged && (
                        <p className="text-xs text-center text-muted-foreground">
                            Click to acknowledge the instructions above
                        </p>
                    )}
                </CardFooter>
            </Card>

            {/* Tips Card */}
            <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Exam Tips
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            Read each question carefully before answering
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            For application questions, show your reasoning process
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            You can navigate between questions before submitting
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            Review all answers before final submission
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
