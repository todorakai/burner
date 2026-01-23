'use client';

/**
 * Stake Visualization Component
 * Prominent display of stake amount with visual emphasis on the "at risk" nature
 * Uses loss aversion psychology to drive learning commitment
 * Requirements: 8.1 - Display stake amounts with prominent visual styling and currency formatting
 */

import { useMemo } from 'react';
import {
    DollarSign,
    AlertTriangle,
    CheckCircle2,
    Flame,
    TrendingDown,
    Shield,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StakeStatus } from '../../types/database';

/**
 * Props for the StakeVisualization component
 */
export interface StakeVisualizationProps {
    /** The stake amount in dollars */
    amount: number;
    /** The current status of the stake */
    status: StakeStatus;
    /** Optional title to display above the stake */
    title?: string;
    /** Optional description text */
    description?: string;
    /** Whether to show animated effects */
    animated?: boolean;
    /** Size variant */
    size?: 'md' | 'lg' | 'xl';
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
 * Get configuration for stake status
 */
function getStatusConfig(status: StakeStatus) {
    switch (status) {
        case 'saved':
            return {
                label: 'Stake Saved!',
                sublabel: 'You proved your learning',
                icon: CheckCircle2,
                secondaryIcon: Shield,
                bgGradient: 'from-green-500/20 via-green-500/10 to-transparent',
                borderColor: 'border-green-500/50',
                glowColor: 'shadow-green-500/20',
                textColor: 'text-green-600 dark:text-green-400',
                accentColor: 'text-green-500',
                badgeClass: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
            };
        case 'burned':
            return {
                label: 'Stake Burned',
                sublabel: 'Better luck next time',
                icon: Flame,
                secondaryIcon: TrendingDown,
                bgGradient: 'from-red-500/20 via-red-500/10 to-transparent',
                borderColor: 'border-red-500/50',
                glowColor: 'shadow-red-500/20',
                textColor: 'text-red-600 dark:text-red-400',
                accentColor: 'text-red-500',
                badgeClass: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
            };
        case 'at_risk':
        default:
            return {
                label: 'At Risk',
                sublabel: 'Prove your learning to save it',
                icon: AlertTriangle,
                secondaryIcon: Zap,
                bgGradient: 'from-orange-500/20 via-orange-500/10 to-transparent',
                borderColor: 'border-orange-500/50',
                glowColor: 'shadow-orange-500/20',
                textColor: 'text-orange-600 dark:text-orange-400',
                accentColor: 'text-orange-500',
                badgeClass: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
            };
    }
}

/**
 * Get size-specific classes
 */
function getSizeClasses(size: 'md' | 'lg' | 'xl') {
    switch (size) {
        case 'xl':
            return {
                container: 'p-8',
                amount: 'text-6xl md:text-7xl',
                icon: 'h-12 w-12',
                secondaryIcon: 'h-6 w-6',
                title: 'text-xl',
                badge: 'text-base px-4 py-2',
            };
        case 'lg':
            return {
                container: 'p-6',
                amount: 'text-4xl md:text-5xl',
                icon: 'h-10 w-10',
                secondaryIcon: 'h-5 w-5',
                title: 'text-lg',
                badge: 'text-sm px-3 py-1.5',
            };
        case 'md':
        default:
            return {
                container: 'p-4',
                amount: 'text-3xl md:text-4xl',
                icon: 'h-8 w-8',
                secondaryIcon: 'h-4 w-4',
                title: 'text-base',
                badge: 'text-sm px-3 py-1',
            };
    }
}

/**
 * StakeVisualization - Prominent display of stake amount
 *
 * Features:
 * - Large, attention-grabbing stake amount display
 * - Color-coded backgrounds and borders by status
 * - Animated pulse effect for "at risk" stakes
 * - Gradient backgrounds for visual depth
 * - Status icons and labels
 * - Multiple size variants
 * - Loss aversion psychology through visual emphasis
 *
 * @example
 * // Basic at-risk stake
 * <StakeVisualization amount={100} status="at_risk" />
 *
 * @example
 * // Large animated display
 * <StakeVisualization
 *   amount={500}
 *   status="at_risk"
 *   size="xl"
 *   animated
 *   title="Your Stake"
 *   description="Pass the exam to save your stake"
 * />
 */
export function StakeVisualization({
    amount,
    status,
    title,
    description,
    animated = true,
    size = 'lg',
    className,
}: StakeVisualizationProps) {
    const config = useMemo(() => getStatusConfig(status), [status]);
    const sizeClasses = useMemo(() => getSizeClasses(size), [size]);

    const StatusIcon = config.icon;
    const SecondaryIcon = config.secondaryIcon;

    return (
        <Card
            className={cn(
                'relative overflow-hidden transition-all duration-300',
                config.borderColor,
                animated && status === 'at_risk' && 'animate-pulse-subtle',
                className
            )}
        >
            {/* Background gradient */}
            <div
                className={cn(
                    'absolute inset-0 bg-gradient-to-br opacity-50',
                    config.bgGradient
                )}
            />

            {/* Decorative corner elements */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <SecondaryIcon className={cn(sizeClasses.icon, config.accentColor)} />
            </div>
            <div className="absolute bottom-0 left-0 p-4 opacity-10">
                <DollarSign className={cn(sizeClasses.icon, config.accentColor)} />
            </div>

            <CardContent className={cn('relative', sizeClasses.container)}>
                <div className="flex flex-col items-center text-center space-y-4">
                    {/* Title */}
                    {title && (
                        <h3 className={cn(
                            'font-medium text-muted-foreground',
                            sizeClasses.title
                        )}>
                            {title}
                        </h3>
                    )}

                    {/* Main stake amount */}
                    <div className="flex items-center gap-3">
                        <StatusIcon
                            className={cn(
                                sizeClasses.icon,
                                config.accentColor,
                                animated && status === 'at_risk' && 'animate-bounce-subtle'
                            )}
                        />
                        <span
                            className={cn(
                                'font-bold tabular-nums tracking-tight',
                                sizeClasses.amount,
                                config.textColor,
                                status === 'burned' && 'line-through opacity-70'
                            )}
                        >
                            {formatCurrency(amount)}
                        </span>
                    </div>

                    {/* Status badge */}
                    <Badge
                        variant="outline"
                        className={cn(
                            'font-medium',
                            sizeClasses.badge,
                            config.badgeClass
                        )}
                    >
                        <SecondaryIcon className={cn(sizeClasses.secondaryIcon, 'mr-1.5')} />
                        {config.label}
                    </Badge>

                    {/* Description or sublabel */}
                    <p className="text-sm text-muted-foreground max-w-xs">
                        {description || config.sublabel}
                    </p>

                    {/* Visual emphasis bar for at-risk stakes */}
                    {status === 'at_risk' && (
                        <div className="w-full max-w-xs mt-2">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        'h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full',
                                        animated && 'animate-pulse'
                                    )}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                                Don&apos;t lose this!
                            </p>
                        </div>
                    )}

                    {/* Success indicator for saved stakes */}
                    {status === 'saved' && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <Shield className="h-4 w-4" />
                            <span className="text-sm font-medium">Protected</span>
                        </div>
                    )}

                    {/* Loss indicator for burned stakes */}
                    {status === 'burned' && (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <TrendingDown className="h-4 w-4" />
                            <span className="text-sm font-medium">Lost</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
