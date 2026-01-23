'use client';

/**
 * Exam Progress Component
 * Shows current question number and progress bar
 * Requirements: 4.1
 */

import { useMemo } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface ExamProgressProps {
    /** Current question index (0-based) */
    currentQuestion: number;
    /** Total number of questions */
    totalQuestions: number;
    /** Array of answered question indices (0-based) */
    answeredQuestions?: number[];
    /** Optional className for styling */
    className?: string;
    /** Whether to show question dots */
    showDots?: boolean;
}

/**
 * ExamProgress - Shows exam progress indicator
 *
 * Features:
 * - Progress bar showing completion percentage
 * - Current question number display
 * - Optional question dots showing answered/unanswered status
 * - Requirement 4.1: Display questions with progress indicator
 */
export function ExamProgress({
    currentQuestion,
    totalQuestions,
    answeredQuestions = [],
    className,
    showDots = true,
}: ExamProgressProps) {
    const progressPercentage = useMemo(() => {
        if (totalQuestions === 0) return 0;
        return Math.round((answeredQuestions.length / totalQuestions) * 100);
    }, [answeredQuestions.length, totalQuestions]);

    const answeredSet = useMemo(
        () => new Set(answeredQuestions),
        [answeredQuestions]
    );

    return (
        <div className={cn('space-y-3', className)}>
            {/* Question counter and progress percentage */}
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                    Question {currentQuestion + 1} of {totalQuestions}
                </span>
                <span className="text-muted-foreground">
                    {answeredQuestions.length} of {totalQuestions} answered ({progressPercentage}%)
                </span>
            </div>

            {/* Progress bar */}
            <Progress value={progressPercentage} className="h-2" />

            {/* Question dots */}
            {showDots && totalQuestions <= 15 && (
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {Array.from({ length: totalQuestions }, (_, index) => {
                        const isAnswered = answeredSet.has(index);
                        const isCurrent = index === currentQuestion;

                        return (
                            <QuestionDot
                                key={index}
                                index={index}
                                isAnswered={isAnswered}
                                isCurrent={isCurrent}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/**
 * Individual question dot indicator
 */
function QuestionDot({
    index,
    isAnswered,
    isCurrent,
}: {
    index: number;
    isAnswered: boolean;
    isCurrent: boolean;
}) {
    return (
        <div
            className={cn(
                'relative flex items-center justify-center transition-all duration-200',
                isCurrent && 'scale-125'
            )}
            title={`Question ${index + 1}${isAnswered ? ' (answered)' : ''}`}
        >
            {isAnswered ? (
                <CheckCircle2
                    className={cn(
                        'h-5 w-5',
                        isCurrent
                            ? 'text-primary'
                            : 'text-green-500 dark:text-green-400'
                    )}
                />
            ) : (
                <Circle
                    className={cn(
                        'h-5 w-5',
                        isCurrent
                            ? 'text-primary fill-primary/20'
                            : 'text-muted-foreground/50'
                    )}
                />
            )}
            {isCurrent && (
                <span className="absolute -bottom-4 text-[10px] font-medium text-primary">
                    {index + 1}
                </span>
            )}
        </div>
    );
}

/**
 * Compact progress indicator for smaller spaces
 */
export function ExamProgressCompact({
    currentQuestion,
    totalQuestions,
    answeredQuestions = [],
    className,
}: Omit<ExamProgressProps, 'showDots'>) {
    const progressPercentage = useMemo(() => {
        if (totalQuestions === 0) return 0;
        return Math.round((answeredQuestions.length / totalQuestions) * 100);
    }, [answeredQuestions.length, totalQuestions]);

    return (
        <div className={cn('flex items-center gap-3', className)}>
            <span className="text-sm font-medium whitespace-nowrap">
                {currentQuestion + 1}/{totalQuestions}
            </span>
            <Progress value={progressPercentage} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
                {progressPercentage}%
            </span>
        </div>
    );
}
