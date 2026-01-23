'use client';

/**
 * Stake Badge Component
 * Compact badge showing stake amount with currency formatting
 * Displays different colors based on stake_status (at_risk=orange, saved=green, burned=red)
 * Requirements: 8.1 - Display stake amounts with prominent visual styling and currency formatting
 */

import { DollarSign, AlertCircle, CheckCircle2, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { StakeStatus } from '../../types/database';

/**
 * Props for the StakeBadge component
 */
export interface StakeBadgeProps {
    /** The stake amount in dollars */
    amount: number;
    /** The current status of the stake */
    status: StakeStatus;
    /** Size variant of the badge */
    size?: 'sm' | 'md' | 'lg';
    /** Whether to show the status icon */
    showIcon?: boolean;
    /** Whether to show the status label */
    showLabel?: boolean;
    /** Optional className for additional styling */
    className?: string;
}

/**
 * Format currency amount for display
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
 * Get configuration for stake status styling
 */
function getStakeStatusConfig(status: StakeStatus) {
    switch (status) {
        case 'saved':
            return {
                label: 'Saved',
                icon: CheckCircle2,
                bgClass: 'bg-green-500/10 hover:bg-green-500/20',
                textClass: 'text-green-600 dark:text-green-400',
                borderClass: 'border-green-500/30',
            };
        case 'burned':
            return {
                label: 'Burned',
                icon: Flame,
                bgClass: 'bg-destructive/10 hover:bg-destructive/20',
                textClass: 'text-destructive',
                borderClass: 'border-destructive/30',
            };
        case 'at_risk':
        default:
            return {
                label: 'At Risk',
                icon: AlertCircle,
                bgClass: 'bg-orange-500/10 hover:bg-orange-500/20',
                textClass: 'text-orange-600 dark:text-orange-400',
                borderClass: 'border-orange-500/30',
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
                badge: 'text-xs px-2 py-0.5',
                icon: 'h-3 w-3',
                amount: 'text-xs font-semibold',
            };
        case 'lg':
            return {
                badge: 'text-base px-4 py-2',
                icon: 'h-5 w-5',
                amount: 'text-base font-bold',
            };
        case 'md':
        default:
            return {
                badge: 'text-sm px-3 py-1',
                icon: 'h-4 w-4',
                amount: 'text-sm font-semibold',
            };
    }
}

/**
 * StakeBadge - Compact badge for displaying stake amounts
 *
 * Features:
 * - Currency formatting with USD symbol
 * - Color-coded by stake status (at_risk=orange, saved=green, burned=red)
 * - Optional status icon and label
 * - Multiple size variants for different contexts
 * - Suitable for use in lists, cards, and compact displays
 *
 * @example
 * // Basic usage
 * <StakeBadge amount={100} status="at_risk" />
 *
 * @example
 * // With icon and label
 * <StakeBadge amount={250} status="saved" showIcon showLabel />
 *
 * @example
 * // Large size
 * <StakeBadge amount={500} status="burned" size="lg" showIcon />
 */
export function StakeBadge({
    amount,
    status,
    size = 'md',
    showIcon = false,
    showLabel = false,
    className,
}: StakeBadgeProps) {
    const statusConfig = getStakeStatusConfig(status);
    const sizeClasses = getSizeClasses(size);
    const StatusIcon = statusConfig.icon;

    return (
        <Badge
            variant="outline"
            className={cn(
                'inline-flex items-center gap-1.5 transition-colors',
                statusConfig.bgClass,
                statusConfig.textClass,
                statusConfig.borderClass,
                sizeClasses.badge,
                status === 'burned' && 'line-through opacity-80',
                className
            )}
        >
            {showIcon && (
                <StatusIcon className={cn(sizeClasses.icon, 'shrink-0')} />
            )}
            <DollarSign className={cn(sizeClasses.icon, 'shrink-0 -mr-0.5')} />
            <span className={cn(sizeClasses.amount, 'tabular-nums')}>
                {formatCurrency(amount).replace('$', '')}
            </span>
            {showLabel && (
                <span className="text-xs opacity-80">({statusConfig.label})</span>
            )}
        </Badge>
    );
}
