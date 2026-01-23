'use client';

/**
 * Stake Status Notification Component
 * Displays prominent notifications when stake status changes
 * Requirements: 6.5 - WHEN a stake status changes THEN THE System SHALL display a prominent notification to the user
 *
 * Uses loss aversion psychology to create impactful notifications:
 * - 'saved': Celebratory notification (green, success)
 * - 'burned': Dramatic notification (red, with option to show burn animation)
 * - 'at_risk': Warning notification (orange)
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
    Flame,
    Shield,
    AlertTriangle,
    PartyPopper,
    DollarSign,
    Clock,
} from 'lucide-react';
import type { StakeStatus } from '../../types/database';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for stake notifications
 */
export interface StakeNotificationConfig {
    /** The stake amount in dollars */
    stakeAmount: number;
    /** The learning topic associated with the stake */
    topic?: string;
    /** Duration in milliseconds for the notification (default varies by type) */
    duration?: number;
    /** Callback when notification is dismissed */
    onDismiss?: () => void;
    /** Callback to trigger burn animation (for burned status) */
    onShowBurnAnimation?: () => void;
}

/**
 * Options for the notification hook
 */
export interface UseStakeNotificationOptions {
    /** Default callback for burn animation */
    onShowBurnAnimation?: () => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a number as USD currency
 */
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Show a notification for when a stake is saved (exam passed)
 * Uses celebratory styling to reinforce positive behavior
 */
export function showStakeSavedNotification(config: StakeNotificationConfig): void {
    const { stakeAmount, topic, duration = 6000, onDismiss } = config;

    toast.success(
        <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <PartyPopper className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <p className="font-semibold text-green-800 dark:text-green-200">
                        Stake Saved!
                    </p>
                </div>
                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                    Congratulations! You&apos;ve protected your{' '}
                    <span className="font-bold">{formatCurrency(stakeAmount)}</span> stake
                    {topic && (
                        <>
                            {' '}by mastering <span className="font-medium">{topic}</span>
                        </>
                    )}
                    .
                </p>
                <p className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
                    Your commitment paid off! 🎉
                </p>
            </div>
        </div>,
        {
            duration,
            onDismiss,
            className: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50',
            style: {
                '--toast-bg': 'var(--green-50)',
                '--toast-border': 'var(--green-200)',
            } as React.CSSProperties,
        }
    );
}

/**
 * Show a notification for when a stake is burned (exam failed after retry)
 * Uses dramatic styling to leverage loss aversion psychology
 */
export function showStakeBurnedNotification(config: StakeNotificationConfig): void {
    const {
        stakeAmount,
        topic,
        duration = 8000,
        onDismiss,
        onShowBurnAnimation,
    } = config;

    toast.error(
        <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-red-100 dark:bg-red-900/30 rounded-full animate-pulse">
                <Flame className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <p className="font-semibold text-red-800 dark:text-red-200">
                        Stake Burned
                    </p>
                </div>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    Your <span className="font-bold">{formatCurrency(stakeAmount)}</span> stake
                    has been burned
                    {topic && (
                        <>
                            {' '}for <span className="font-medium">{topic}</span>
                        </>
                    )}
                    .
                </p>
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    Don&apos;t give up! Use this as motivation for your next commitment.
                </p>
                {onShowBurnAnimation && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowBurnAnimation();
                        }}
                        className="mt-2 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 underline underline-offset-2"
                    >
                        View burn animation 🔥
                    </button>
                )}
            </div>
        </div>,
        {
            duration,
            onDismiss,
            className: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50',
            style: {
                '--toast-bg': 'var(--red-50)',
                '--toast-border': 'var(--red-200)',
            } as React.CSSProperties,
        }
    );
}

/**
 * Show a notification for when a stake is at risk
 * Uses warning styling to create urgency
 */
export function showStakeAtRiskNotification(config: StakeNotificationConfig): void {
    const { stakeAmount, topic, duration = 5000, onDismiss } = config;

    toast.warning(
        <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <p className="font-semibold text-orange-800 dark:text-orange-200">
                        Stake At Risk!
                    </p>
                </div>
                <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                    Your <span className="font-bold">{formatCurrency(stakeAmount)}</span> stake
                    is at risk
                    {topic && (
                        <>
                            {' '}for <span className="font-medium">{topic}</span>
                        </>
                    )}
                    .
                </p>
                <p className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                    Complete your exam before the deadline to save it! ⏰
                </p>
            </div>
        </div>,
        {
            duration,
            onDismiss,
            className: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/50',
            style: {
                '--toast-bg': 'var(--orange-50)',
                '--toast-border': 'var(--orange-200)',
            } as React.CSSProperties,
        }
    );
}

/**
 * Show a notification based on stake status
 * Main entry point for stake notifications
 */
export function showStakeNotification(
    status: StakeStatus,
    config: StakeNotificationConfig
): void {
    switch (status) {
        case 'saved':
            showStakeSavedNotification(config);
            break;
        case 'burned':
            showStakeBurnedNotification(config);
            break;
        case 'at_risk':
            showStakeAtRiskNotification(config);
            break;
    }
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing stake notifications
 * Provides memoized notification functions for use in components
 *
 * @example
 * ```tsx
 * const { notifyStakeChange, notifySaved, notifyBurned, notifyAtRisk } = useStakeNotification({
 *   onShowBurnAnimation: () => setShowBurnAnimation(true),
 * });
 *
 * // Notify based on status
 * notifyStakeChange('saved', { stakeAmount: 100, topic: 'React' });
 *
 * // Or use specific functions
 * notifySaved({ stakeAmount: 100, topic: 'React' });
 * ```
 */
export function useStakeNotification(options: UseStakeNotificationOptions = {}) {
    const { onShowBurnAnimation: defaultOnShowBurnAnimation } = options;

    const notifySaved = useCallback(
        (config: StakeNotificationConfig) => {
            showStakeSavedNotification(config);
        },
        []
    );

    const notifyBurned = useCallback(
        (config: StakeNotificationConfig) => {
            showStakeBurnedNotification({
                ...config,
                onShowBurnAnimation: config.onShowBurnAnimation ?? defaultOnShowBurnAnimation,
            });
        },
        [defaultOnShowBurnAnimation]
    );

    const notifyAtRisk = useCallback(
        (config: StakeNotificationConfig) => {
            showStakeAtRiskNotification(config);
        },
        []
    );

    const notifyStakeChange = useCallback(
        (status: StakeStatus, config: StakeNotificationConfig) => {
            switch (status) {
                case 'saved':
                    notifySaved(config);
                    break;
                case 'burned':
                    notifyBurned(config);
                    break;
                case 'at_risk':
                    notifyAtRisk(config);
                    break;
            }
        },
        [notifySaved, notifyBurned, notifyAtRisk]
    );

    return {
        /** Notify based on stake status */
        notifyStakeChange,
        /** Show saved notification */
        notifySaved,
        /** Show burned notification */
        notifyBurned,
        /** Show at risk notification */
        notifyAtRisk,
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { StakeStatus };
