'use client';

/**
 * Urgency Indicator Component
 * Displays deadline proximity with escalating visual cues
 * Requirements: 7.5, 8.2
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, AlertTriangle, Flame, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * Props for the UrgencyIndicator component
 */
export interface UrgencyIndicatorProps {
    /** ISO timestamp of the deadline */
    deadline: string;
    /** Size variant of the indicator */
    size?: 'sm' | 'md' | 'lg';
    /** Whether to show countdown timer */
    showCountdown?: boolean;
    /** Whether to show urgency label */
    showLabel?: boolean;
    /** Optional className for additional styling */
    className?: string;
}

/**
 * Urgency levels based on time remaining
 */
export type UrgencyLevel = 'normal' | 'warning' | 'urgent' | 'critical' | 'expired';

/**
 * Time remaining breakdown
 */
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
 * - critical: < 1 hour - intense red with strong animation
 * - urgent: < 24 hours - red styling with animation
 * - warning: 1-7 days - yellow/amber styling
 * - normal: > 7 days - calm styling
 */
function getUrgencyLevel(timeRemaining: TimeRemaining): UrgencyLevel {
    if (timeRemaining.isExpired) return 'expired';

    const hoursRemaining = timeRemaining.totalMs / (1000 * 60 * 60);
    const daysRemaining = hoursRemaining / 24;

    if (hoursRemaining < 1) return 'critical';
    if (hoursRemaining < 24) return 'urgent';
    if (daysRemaining <= 7) return 'warning';
    return 'normal';
}

/**
 * Get urgency configuration for styling and display
 */
function getUrgencyConfig(level: UrgencyLevel) {
    switch (level) {
        case 'expired':
            return {
                label: 'Expired',
                icon: Flame,
                bgClass: 'bg-destructive/20',
                textClass: 'text-destructive',
                borderClass: 'border-destructive/50',
                animationClass: '',
                pulseClass: '',
            };
        case 'critical':
            return {
                label: 'Critical',
                icon: Zap,
                bgClass: 'bg-red-600/20 dark:bg-red-500/30',
                textClass: 'text-red-600 dark:text-red-400',
                borderClass: 'border-red-600/50 dark:border-red-500/50',
                animationClass: 'animate-pulse',
                pulseClass: 'shadow-[0_0_15px_rgba(220,38,38,0.5)] dark:shadow-[0_0_15px_rgba(248,113,113,0.4)]',
            };
        case 'urgent':
            return {
                label: 'Urgent',
                icon: AlertTriangle,
                bgClass: 'bg-red-500/15 dark:bg-red-500/20',
                textClass: 'text-red-500 dark:text-red-400',
                borderClass: 'border-red-500/40',
                animationClass: 'animate-pulse',
                pulseClass: '',
            };
        case 'warning':
            return {
                label: 'Soon',
                icon: Timer,
                bgClass: 'bg-amber-500/15 dark:bg-amber-500/20',
                textClass: 'text-amber-600 dark:text-amber-400',
                borderClass: 'border-amber-500/40',
                animationClass: '',
                pulseClass: '',
            };
        case 'normal':
        default:
            return {
                label: 'On Track',
                icon: Clock,
                bgClass: 'bg-muted/50',
                textClass: 'text-muted-foreground',
                borderClass: 'border-border',
                animationClass: '',
                pulseClass: '',
            };
    }
}

/**
 * Get size-specific classes
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg') {
    switch (size) {
        case 'sm':
            return {
                container: 'text-xs px-2 py-0.5 gap-1',
                icon: 'h-3 w-3',
                text: 'text-xs',
                countdown: 'text-xs font-medium',
            };
        case 'lg':
            return {
                container: 'text-base px-4 py-2 gap-2',
                icon: 'h-5 w-5',
                text: 'text-base',
                countdown: 'text-base font-bold',
            };
        case 'md':
        default:
            return {
                container: 'text-sm px-3 py-1.5 gap-1.5',
                icon: 'h-4 w-4',
                text: 'text-sm',
                countdown: 'text-sm font-semibold',
            };
    }
}

/**
 * Format time remaining as human-readable string
 */
function formatTimeRemaining(time: TimeRemaining, level: UrgencyLevel): string {
    if (time.isExpired) return 'Expired';

    // For critical (< 1 hour), show minutes and seconds
    if (level === 'critical') {
        if (time.minutes === 0) {
            return `${time.seconds}s`;
        }
        return `${time.minutes}m ${time.seconds}s`;
    }

    // For urgent (< 24 hours), show hours and minutes
    if (level === 'urgent') {
        if (time.hours === 0) {
            return `${time.minutes}m`;
        }
        return `${time.hours}h ${time.minutes}m`;
    }

    // For warning (1-7 days), show days and hours
    if (level === 'warning') {
        if (time.days === 0) {
            return `${time.hours}h`;
        }
        return `${time.days}d ${time.hours}h`;
    }

    // For normal (> 7 days), show days
    return `${time.days} days`;
}

/**
 * UrgencyIndicator - Displays deadline proximity with escalating visual cues
 *
 * Features:
 * - Calculates time remaining until deadline
 * - Shows different urgency levels:
 *   - Normal (>7 days): calm styling
 *   - Warning (1-7 days): yellow/amber styling
 *   - Urgent (<24 hours): red styling with animation
 *   - Critical (<1 hour): intense red with strong animation
 * - Includes visual cues like pulsing, color changes
 * - Displays time remaining in human-readable format
 * - Real-time countdown updates
 *
 * Requirements:
 * - 7.5: Highlight commitments with urgent visual styling within 24 hours
 * - 8.2: Display increasingly urgent visual cues as deadline approaches
 *
 * @example
 * // Basic usage
 * <UrgencyIndicator deadline="2024-01-15T12:00:00Z" />
 *
 * @example
 * // With countdown and label
 * <UrgencyIndicator deadline={commitment.deadline} showCountdown showLabel />
 *
 * @example
 * // Large size
 * <UrgencyIndicator deadline={deadline} size="lg" showCountdown />
 */
export function UrgencyIndicator({
    deadline,
    size = 'md',
    showCountdown = true,
    showLabel = false,
    className,
}: UrgencyIndicatorProps) {
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
        calculateTimeRemaining(deadline)
    );

    // Memoize the update function
    const updateTimeRemaining = useCallback(() => {
        setTimeRemaining(calculateTimeRemaining(deadline));
    }, [deadline]);

    useEffect(() => {
        // Update immediately
        updateTimeRemaining();

        // Determine update interval based on urgency
        // Critical: every second, Urgent: every second, Warning: every minute, Normal: every minute
        const getInterval = () => {
            const time = calculateTimeRemaining(deadline);
            const level = getUrgencyLevel(time);
            if (level === 'critical' || level === 'urgent') return 1000; // 1 second
            return 60000; // 1 minute
        };

        let interval = setInterval(updateTimeRemaining, getInterval());

        // Re-evaluate interval when urgency level might change
        const checkInterval = setInterval(() => {
            clearInterval(interval);
            interval = setInterval(updateTimeRemaining, getInterval());
        }, 60000); // Check every minute

        return () => {
            clearInterval(interval);
            clearInterval(checkInterval);
        };
    }, [deadline, updateTimeRemaining]);

    const urgencyLevel = useMemo(() => getUrgencyLevel(timeRemaining), [timeRemaining]);
    const config = useMemo(() => getUrgencyConfig(urgencyLevel), [urgencyLevel]);
    const sizeClasses = useMemo(() => getSizeClasses(size), [size]);
    const formattedTime = useMemo(
        () => formatTimeRemaining(timeRemaining, urgencyLevel),
        [timeRemaining, urgencyLevel]
    );

    const Icon = config.icon;

    return (
        <Badge
            variant="outline"
            className={cn(
                'inline-flex items-center transition-all duration-300',
                config.bgClass,
                config.textClass,
                config.borderClass,
                config.animationClass,
                config.pulseClass,
                sizeClasses.container,
                className
            )}
        >
            <Icon className={cn(sizeClasses.icon, 'shrink-0')} />

            {showCountdown && (
                <span className={cn(sizeClasses.countdown, 'tabular-nums')}>
                    {formattedTime}
                </span>
            )}

            {showLabel && (
                <span className={cn(sizeClasses.text, 'opacity-80')}>
                    {config.label}
                </span>
            )}
        </Badge>
    );
}

/**
 * Hook to get urgency level for a deadline
 * Useful for conditional styling in parent components
 */
export function useUrgencyLevel(deadline: string): UrgencyLevel {
    const [level, setLevel] = useState<UrgencyLevel>(() =>
        getUrgencyLevel(calculateTimeRemaining(deadline))
    );

    useEffect(() => {
        const updateLevel = () => {
            setLevel(getUrgencyLevel(calculateTimeRemaining(deadline)));
        };

        updateLevel();
        const interval = setInterval(updateLevel, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [deadline]);

    return level;
}

/**
 * Utility function to check if deadline is urgent (< 24 hours)
 */
export function isDeadlineUrgent(deadline: string): boolean {
    const time = calculateTimeRemaining(deadline);
    const level = getUrgencyLevel(time);
    return level === 'urgent' || level === 'critical' || level === 'expired';
}

/**
 * Utility function to check if deadline is critical (< 1 hour)
 */
export function isDeadlineCritical(deadline: string): boolean {
    const time = calculateTimeRemaining(deadline);
    const level = getUrgencyLevel(time);
    return level === 'critical' || level === 'expired';
}
