'use client';

/**
 * Stats Overview Component
 * Displays aggregate statistics for the Burner dashboard
 * Requirements: 7.4 - Display aggregate statistics including total stakes, stakes saved, and stakes burned
 */

import {
    Target,
    TrendingUp,
    TrendingDown,
    Flame,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Commitment, CommitmentStatus, StakeStatus } from '../../types/database';

/**
 * Props for the StatsOverview component
 */
export interface StatsOverviewProps {
    /** Array of commitments to calculate statistics from */
    commitments: Commitment[];
    /** Optional className for styling */
    className?: string;
}

/**
 * Calculated statistics from commitments
 */
interface CommitmentStats {
    totalStakes: number;
    stakesSaved: number;
    stakesBurned: number;
    stakesAtRisk: number;
    countByStatus: Record<CommitmentStatus, number>;
    totalCommitments: number;
}

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

/**
 * Calculate aggregate statistics from commitments
 * @param commitments - Array of commitments
 * @returns Calculated statistics
 */
function calculateStats(commitments: Commitment[]): CommitmentStats {
    const stats: CommitmentStats = {
        totalStakes: 0,
        stakesSaved: 0,
        stakesBurned: 0,
        stakesAtRisk: 0,
        countByStatus: {
            active: 0,
            completed: 0,
            failed: 0,
            expired: 0,
        },
        totalCommitments: commitments.length,
    };

    for (const commitment of commitments) {
        // Sum total stakes
        stats.totalStakes += commitment.stake_amount;

        // Sum by stake status
        if (commitment.stake_status === 'saved') {
            stats.stakesSaved += commitment.stake_amount;
        } else if (commitment.stake_status === 'burned') {
            stats.stakesBurned += commitment.stake_amount;
        } else if (commitment.stake_status === 'at_risk') {
            stats.stakesAtRisk += commitment.stake_amount;
        }

        // Count by commitment status
        stats.countByStatus[commitment.status]++;
    }

    return stats;
}

/**
 * Individual stat card component
 */
interface StatCardProps {
    title: string;
    value: string;
    description: string;
    icon: React.ReactNode;
    valueClassName?: string;
}

function StatCard({ title, value, description, icon, valueClassName }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueClassName || ''}`}>{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

/**
 * Status badge component for commitment counts
 */
interface StatusBadgeProps {
    status: CommitmentStatus;
    count: number;
}

function StatusBadge({ status, count }: StatusBadgeProps) {
    const config: Record<CommitmentStatus, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
        active: {
            label: 'Active',
            icon: <Clock className="h-3 w-3" />,
            variant: 'default',
        },
        completed: {
            label: 'Completed',
            icon: <CheckCircle2 className="h-3 w-3" />,
            variant: 'secondary',
        },
        failed: {
            label: 'Failed',
            icon: <XCircle className="h-3 w-3" />,
            variant: 'destructive',
        },
        expired: {
            label: 'Expired',
            icon: <AlertTriangle className="h-3 w-3" />,
            variant: 'outline',
        },
    };

    const { label, icon, variant } = config[status];

    return (
        <Badge variant={variant} className="gap-1">
            {icon}
            {label}: {count}
        </Badge>
    );
}

/**
 * Stats Overview Component
 * Displays aggregate statistics for commitments including:
 * - Total stakes amount
 * - Stakes saved (from passed exams)
 * - Stakes burned (from failed/expired commitments)
 * - Stakes at risk (active commitments)
 * - Commitment counts by status
 *
 * @param props - Component props
 * @returns Stats overview component
 */
export function StatsOverview({ commitments, className }: StatsOverviewProps) {
    const stats = calculateStats(commitments);

    return (
        <div className={className}>
            {/* Main Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Staked"
                    value={formatCurrency(stats.totalStakes)}
                    description={`${stats.totalCommitments} total commitment${stats.totalCommitments !== 1 ? 's' : ''}`}
                    icon={<Target className="h-4 w-4 text-muted-foreground" />}
                />

                <StatCard
                    title="Stakes Saved"
                    value={formatCurrency(stats.stakesSaved)}
                    description="From passed exams"
                    icon={<TrendingUp className="h-4 w-4 text-green-500" />}
                    valueClassName="text-green-600"
                />

                <StatCard
                    title="Stakes Burned"
                    value={formatCurrency(stats.stakesBurned)}
                    description="From failed/expired"
                    icon={<TrendingDown className="h-4 w-4 text-destructive" />}
                    valueClassName="text-destructive"
                />

                <StatCard
                    title="At Risk"
                    value={formatCurrency(stats.stakesAtRisk)}
                    description="Prove your learning!"
                    icon={<Flame className="h-4 w-4 text-orange-500" />}
                    valueClassName="text-orange-600"
                />
            </div>

            {/* Status Counts */}
            <div className="mt-4 flex flex-wrap gap-2">
                {(Object.keys(stats.countByStatus) as CommitmentStatus[]).map((status) => (
                    <StatusBadge
                        key={status}
                        status={status}
                        count={stats.countByStatus[status]}
                    />
                ))}
            </div>
        </div>
    );
}
