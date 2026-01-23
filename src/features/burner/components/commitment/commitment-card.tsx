'use client';

/**
 * Commitment Card Component
 * Displays a single commitment with topic, stake, deadline, and status
 * Requirements: 7.2, 7.5, 8.1
 */

import { useMemo } from 'react';
import Link from 'next/link';
import {
    BookOpen,
    DollarSign,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    RefreshCw,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    CardAction,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { Commitment, CommitmentStatus, StakeStatus } from '../../types/database';
import { CountdownTimer } from './countdown-timer';

interface CommitmentCardProps {
    /** The commitment to display */
    commitment: Commitment;
    /** Optional className for styling */
    className?: string;
    /** Whether to show action buttons */
    showActions?: boolean;
    /** Callback when "Take Exam" is clicked */
    onTakeExam?: (commitmentId: string) => void;
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
 * Get status badge configuration
 */
function getStatusConfig(status: CommitmentStatus): {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof CheckCircle2;
} {
    switch (status) {
        case 'completed':
            return {
                label: 'Completed',
                variant: 'default',
                icon: CheckCircle2,
            };
        case 'failed':
            return {
                label: 'Failed',
                variant: 'destructive',
                icon: XCircle,
            };
        case 'expired':
            return {
                label: 'Expired',
                variant: 'destructive',
                icon: Clock,
            };
        case 'active':
        default:
            return {
                label: 'Active',
                variant: 'secondary',
                icon: AlertCircle,
            };
    }
}

/**
 * Get stake status badge configuration
 */
function getStakeStatusConfig(stakeStatus: StakeStatus): {
    label: string;
    className: string;
    icon: typeof DollarSign;
} {
    switch (stakeStatus) {
        case 'saved':
            return {
                label: 'Saved',
                className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
                icon: CheckCircle2,
            };
        case 'burned':
            return {
                label: 'Burned',
                className: 'bg-destructive/10 text-destructive border-destructive/30',
                icon: XCircle,
            };
        case 'at_risk':
        default:
            return {
                label: 'At Risk',
                className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
                icon: AlertCircle,
            };
    }
}

/**
 * Check if deadline is within 24 hours (urgent)
 */
function isUrgent(deadline: string): boolean {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursRemaining > 0 && hoursRemaining < 24;
}

/**
 * CommitmentCard - Displays a single commitment
 *
 * Features:
 * - Topic display with icon
 * - Stake amount with prominent currency formatting (Requirement 8.1)
 * - Countdown timer for deadline
 * - Status and stake status badges
 * - Urgent visual styling within 24 hours (Requirement 7.5)
 * - Retry indicator when retry is available
 * - Action buttons for taking exams
 */
export function CommitmentCard({
    commitment,
    className,
    showActions = true,
    onTakeExam,
}: CommitmentCardProps) {
    const statusConfig = useMemo(() => getStatusConfig(commitment.status), [commitment.status]);
    const stakeStatusConfig = useMemo(() => getStakeStatusConfig(commitment.stake_status), [commitment.stake_status]);
    const urgent = useMemo(() => isUrgent(commitment.deadline), [commitment.deadline]);

    const StatusIcon = statusConfig.icon;
    const StakeIcon = stakeStatusConfig.icon;

    const isActive = commitment.status === 'active';
    const canTakeExam = isActive && !commitment.retry_used;
    const canRetry = isActive && commitment.retry_used === false;

    return (
        <Card
            className={cn(
                'transition-all duration-200 hover:shadow-md',
                urgent && isActive && 'border-orange-500/50 shadow-orange-500/10',
                commitment.stake_status === 'burned' && 'border-destructive/50 opacity-90',
                className
            )}
        >
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={cn(
                            'rounded-lg p-2 shrink-0',
                            isActive ? 'bg-primary/10' : 'bg-muted'
                        )}>
                            <BookOpen className={cn(
                                'h-5 w-5',
                                isActive ? 'text-primary' : 'text-muted-foreground'
                            )} />
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="text-lg truncate">
                                {commitment.topic}
                            </CardTitle>
                            <CardDescription className="mt-1">
                                {commitment.duration_days} day commitment
                            </CardDescription>
                        </div>
                    </div>
                    <CardAction>
                        <Badge variant={statusConfig.variant} className="shrink-0">
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                        </Badge>
                    </CardAction>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Stake Amount - Prominent Display (Requirement 8.1) */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DollarSign className={cn(
                            'h-5 w-5',
                            commitment.stake_status === 'at_risk' && 'text-orange-500',
                            commitment.stake_status === 'saved' && 'text-green-500',
                            commitment.stake_status === 'burned' && 'text-destructive'
                        )} />
                        <span className={cn(
                            'text-2xl font-bold tabular-nums',
                            commitment.stake_status === 'at_risk' && 'text-orange-600 dark:text-orange-400',
                            commitment.stake_status === 'saved' && 'text-green-600 dark:text-green-400',
                            commitment.stake_status === 'burned' && 'text-destructive line-through'
                        )}>
                            {formatCurrency(commitment.stake_amount)}
                        </span>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn('shrink-0', stakeStatusConfig.className)}
                    >
                        <StakeIcon className="h-3 w-3" />
                        {stakeStatusConfig.label}
                    </Badge>
                </div>

                {/* Countdown Timer */}
                {isActive && (
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-muted-foreground">Time Remaining:</span>
                        <CountdownTimer deadline={commitment.deadline} compact />
                    </div>
                )}

                {/* Retry Indicator */}
                {isActive && commitment.retry_used && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                        <RefreshCw className="h-4 w-4" />
                        <span>Retry used - this is your final attempt</span>
                    </div>
                )}

                {/* Expired/Failed Message */}
                {!isActive && (
                    <div className={cn(
                        'text-sm rounded-md px-3 py-2',
                        commitment.status === 'completed' && 'bg-green-500/10 text-green-600 dark:text-green-400',
                        (commitment.status === 'failed' || commitment.status === 'expired') && 'bg-destructive/10 text-destructive'
                    )}>
                        {commitment.status === 'completed' && (
                            <span>🎉 Congratulations! You proved your learning and saved your stake.</span>
                        )}
                        {commitment.status === 'failed' && (
                            <span>😔 You didn&apos;t pass the exam. Your stake has been burned.</span>
                        )}
                        {commitment.status === 'expired' && (
                            <span>⏰ Time ran out. Your stake has been burned.</span>
                        )}
                    </div>
                )}
            </CardContent>

            {showActions && (
                <CardFooter className="flex justify-between gap-2 border-t pt-4">
                    <Link
                        href={`/dashboard/burner/commitment/${commitment.id}`}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        View Details
                    </Link>
                    {canTakeExam && (
                        <Button
                            size="sm"
                            onClick={() => onTakeExam?.(commitment.id)}
                            className={cn(
                                urgent && 'bg-orange-500 hover:bg-orange-600'
                            )}
                        >
                            {canRetry ? 'Take Exam' : 'Retry Exam'}
                            <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}
