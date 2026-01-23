'use client';

/**
 * Exam Timer Component
 * Displays elapsed time since exam started
 * Requirements: 4.4
 */

import { useState, useEffect, useMemo } from 'react';
import { Clock, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExamTimerProps {
    /** ISO timestamp when the exam started */
    startedAt: string;
    /** Optional className for styling */
    className?: string;
    /** Whether to show compact version */
    compact?: boolean;
}

interface ElapsedTime {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
}

/**
 * Calculate elapsed time since start
 */
function calculateElapsedTime(startedAt: string): ElapsedTime {
    const startDate = new Date(startedAt);
    const now = new Date();
    const totalSeconds = Math.floor((now.getTime() - startDate.getTime()) / 1000);

    if (totalSeconds < 0) {
        return {
            hours: 0,
            minutes: 0,
            seconds: 0,
            totalSeconds: 0,
        };
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
        hours,
        minutes,
        seconds,
        totalSeconds,
    };
}

/**
 * Format time unit with leading zero
 */
function padZero(num: number): string {
    return num.toString().padStart(2, '0');
}

/**
 * Get styling based on elapsed time
 * - normal: < 30 minutes
 * - warning: 30-60 minutes
 * - long: > 60 minutes
 */
function getTimeStyles(totalSeconds: number) {
    const minutes = totalSeconds / 60;

    if (minutes > 60) {
        return {
            container: 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
            icon: 'text-orange-500',
            text: 'text-orange-600 dark:text-orange-400',
        };
    }
    if (minutes > 30) {
        return {
            container: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
            icon: 'text-yellow-500',
            text: 'text-yellow-600 dark:text-yellow-400',
        };
    }
    return {
        container: 'bg-muted/50 border-border text-muted-foreground',
        icon: 'text-muted-foreground',
        text: 'text-foreground',
    };
}

/**
 * ExamTimer - Displays elapsed time since exam started
 *
 * Features:
 * - Real-time elapsed time updates every second
 * - Visual indicators for long exam sessions
 * - Compact and full display modes
 * - Requirement 4.4: Display timer showing elapsed time
 */
export function ExamTimer({ startedAt, className, compact = false }: ExamTimerProps) {
    const [elapsedTime, setElapsedTime] = useState<ElapsedTime>(() =>
        calculateElapsedTime(startedAt)
    );

    useEffect(() => {
        // Update immediately
        setElapsedTime(calculateElapsedTime(startedAt));

        // Update every second
        const interval = setInterval(() => {
            setElapsedTime(calculateElapsedTime(startedAt));
        }, 1000);

        return () => clearInterval(interval);
    }, [startedAt]);

    const styles = useMemo(
        () => getTimeStyles(elapsedTime.totalSeconds),
        [elapsedTime.totalSeconds]
    );

    if (compact) {
        // Compact format: "5:30" or "1:05:30"
        let displayText: string;
        if (elapsedTime.hours > 0) {
            displayText = `${elapsedTime.hours}:${padZero(elapsedTime.minutes)}:${padZero(elapsedTime.seconds)}`;
        } else {
            displayText = `${elapsedTime.minutes}:${padZero(elapsedTime.seconds)}`;
        }

        return (
            <div
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2 py-1',
                    styles.container,
                    className
                )}
            >
                <Timer className={cn('h-3.5 w-3.5', styles.icon)} />
                <span className={cn('text-xs font-mono font-medium', styles.text)}>
                    {displayText}
                </span>
            </div>
        );
    }

    // Full format with labels
    return (
        <div
            className={cn(
                'inline-flex items-center gap-3 rounded-lg border px-4 py-2',
                styles.container,
                className
            )}
        >
            <Clock className={cn('h-5 w-5', styles.icon)} />
            <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground mr-1">Elapsed:</span>
                {elapsedTime.hours > 0 && (
                    <>
                        <TimeUnit value={elapsedTime.hours} label="h" styles={styles} />
                        <span className={cn('text-sm', styles.text)}>:</span>
                    </>
                )}
                <TimeUnit value={elapsedTime.minutes} label="m" styles={styles} />
                <span className={cn('text-sm', styles.text)}>:</span>
                <TimeUnit value={elapsedTime.seconds} label="s" styles={styles} />
            </div>
        </div>
    );
}

/**
 * Individual time unit display
 */
function TimeUnit({
    value,
    label,
    styles,
}: {
    value: number;
    label: string;
    styles: ReturnType<typeof getTimeStyles>;
}) {
    return (
        <div className="flex items-baseline gap-0.5">
            <span className={cn('text-lg font-mono font-bold tabular-nums', styles.text)}>
                {padZero(value)}
            </span>
            <span className={cn('text-xs', styles.text)}>{label}</span>
        </div>
    );
}
