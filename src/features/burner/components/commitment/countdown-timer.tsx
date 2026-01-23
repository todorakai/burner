'use client';

/**
 * Countdown Timer Component
 * Displays time remaining until deadline with urgency styling
 * Requirements: 7.5, 8.2
 */

import { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
    /** ISO timestamp of the deadline */
    deadline: string;
    /** Optional className for styling */
    className?: string;
    /** Whether to show compact version */
    compact?: boolean;
}

interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isExpired: boolean;
}

/**
 * Calculate time remaining until deadline
 */
function calculateTimeRemaining(deadline: string): TimeRemaining {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const totalMs = deadlineDate.getTime() - now.getTime();

    if (totalMs <= 0) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            totalMs: 0,
            isExpired: true,
        };
    }

    const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

    return {
        days,
        hours,
        minutes,
        seconds,
        totalMs,
        isExpired: false,
    };
}

/**
 * Determine urgency level based on time remaining
 * - critical: < 6 hours
 * - urgent: < 24 hours
 * - warning: < 3 days
 * - normal: >= 3 days
 */
function getUrgencyLevel(timeRemaining: TimeRemaining): 'critical' | 'urgent' | 'warning' | 'normal' | 'expired' {
    if (timeRemaining.isExpired) return 'expired';

    const hoursRemaining = timeRemaining.totalMs / (1000 * 60 * 60);

    if (hoursRemaining < 6) return 'critical';
    if (hoursRemaining < 24) return 'urgent';
    if (hoursRemaining < 72) return 'warning';
    return 'normal';
}

/**
 * Get styling classes based on urgency level
 */
function getUrgencyStyles(urgency: ReturnType<typeof getUrgencyLevel>) {
    switch (urgency) {
        case 'expired':
            return {
                container: 'bg-destructive/10 border-destructive/30 text-destructive',
                icon: 'text-destructive',
                text: 'text-destructive font-semibold',
            };
        case 'critical':
            return {
                container: 'bg-destructive/10 border-destructive/30 text-destructive animate-pulse',
                icon: 'text-destructive',
                text: 'text-destructive font-bold',
            };
        case 'urgent':
            return {
                container: 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
                icon: 'text-orange-500',
                text: 'text-orange-600 dark:text-orange-400 font-semibold',
            };
        case 'warning':
            return {
                container: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
                icon: 'text-yellow-500',
                text: 'text-yellow-600 dark:text-yellow-400',
            };
        default:
            return {
                container: 'bg-muted/50 border-border text-muted-foreground',
                icon: 'text-muted-foreground',
                text: 'text-foreground',
            };
    }
}

/**
 * Format time unit with leading zero
 */
function padZero(num: number): string {
    return num.toString().padStart(2, '0');
}

/**
 * CountdownTimer - Displays time remaining until deadline
 *
 * Features:
 * - Real-time countdown updates every second
 * - Visual urgency indicators based on time remaining
 * - Compact and full display modes
 * - Animated pulse for critical deadlines
 * - Requirement 7.5: Urgent styling within 24 hours
 * - Requirement 8.2: Escalating visual cues as deadline approaches
 */
export function CountdownTimer({ deadline, className, compact = false }: CountdownTimerProps) {
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
        calculateTimeRemaining(deadline)
    );

    useEffect(() => {
        // Update immediately
        setTimeRemaining(calculateTimeRemaining(deadline));

        // Update every second
        const interval = setInterval(() => {
            const remaining = calculateTimeRemaining(deadline);
            setTimeRemaining(remaining);

            // Clear interval if expired
            if (remaining.isExpired) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [deadline]);

    const urgency = useMemo(() => getUrgencyLevel(timeRemaining), [timeRemaining]);
    const styles = useMemo(() => getUrgencyStyles(urgency), [urgency]);

    // Get appropriate icon based on urgency
    const Icon = urgency === 'expired' || urgency === 'critical'
        ? Flame
        : urgency === 'urgent'
            ? AlertTriangle
            : Clock;

    if (timeRemaining.isExpired) {
        return (
            <div
                className={cn(
                    'inline-flex items-center gap-2 rounded-md border px-3 py-1.5',
                    styles.container,
                    className
                )}
            >
                <Icon className={cn('h-4 w-4', styles.icon)} />
                <span className={cn('text-sm', styles.text)}>Expired</span>
            </div>
        );
    }

    if (compact) {
        // Compact format: "2d 5h" or "5h 30m" or "30m 15s"
        let displayText: string;
        if (timeRemaining.days > 0) {
            displayText = `${timeRemaining.days}d ${timeRemaining.hours}h`;
        } else if (timeRemaining.hours > 0) {
            displayText = `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
        } else {
            displayText = `${timeRemaining.minutes}m ${timeRemaining.seconds}s`;
        }

        return (
            <div
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2 py-1',
                    styles.container,
                    className
                )}
            >
                <Icon className={cn('h-3.5 w-3.5', styles.icon)} />
                <span className={cn('text-xs font-medium', styles.text)}>
                    {displayText}
                </span>
            </div>
        );
    }

    // Full format with all units
    return (
        <div
            className={cn(
                'inline-flex items-center gap-3 rounded-lg border px-4 py-2',
                styles.container,
                className
            )}
        >
            <Icon className={cn('h-5 w-5', styles.icon)} />
            <div className="flex items-center gap-1">
                {timeRemaining.days > 0 && (
                    <>
                        <TimeUnit value={timeRemaining.days} label="d" styles={styles} />
                        <span className={cn('text-sm', styles.text)}>:</span>
                    </>
                )}
                <TimeUnit value={timeRemaining.hours} label="h" styles={styles} />
                <span className={cn('text-sm', styles.text)}>:</span>
                <TimeUnit value={timeRemaining.minutes} label="m" styles={styles} />
                <span className={cn('text-sm', styles.text)}>:</span>
                <TimeUnit value={timeRemaining.seconds} label="s" styles={styles} />
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
    styles
}: {
    value: number;
    label: string;
    styles: ReturnType<typeof getUrgencyStyles>;
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
