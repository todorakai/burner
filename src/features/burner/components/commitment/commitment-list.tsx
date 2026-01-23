'use client';

/**
 * Commitment List Component
 * Displays all user commitments with filtering and sorting
 * Requirements: 7.1, 7.2
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ListFilter,
    SortAsc,
    SortDesc,
    Plus,
    Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import type { Commitment, CommitmentStatus } from '../../types/database';
import { CommitmentCard } from './commitment-card';

interface CommitmentListProps {
    /** Array of commitments to display */
    commitments: Commitment[];
    /** Optional className for styling */
    className?: string;
    /** Whether to show filter controls */
    showFilters?: boolean;
    /** Callback when "Create Commitment" is clicked */
    onCreateCommitment?: () => void;
    /** Callback when "Take Exam" is clicked on a commitment */
    onTakeExam?: (commitmentId: string) => void;
    /** Title for the list section */
    title?: string;
    /** Whether the list is loading */
    isLoading?: boolean;
}

type FilterStatus = 'all' | CommitmentStatus;
type SortOption = 'deadline' | 'stake' | 'created';
type SortDirection = 'asc' | 'desc';

/**
 * Sort commitments based on selected option and direction
 */
function sortCommitments(
    commitments: Commitment[],
    sortBy: SortOption,
    direction: SortDirection
): Commitment[] {
    const sorted = [...commitments].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'deadline':
                comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                break;
            case 'stake':
                comparison = a.stake_amount - b.stake_amount;
                break;
            case 'created':
                comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                break;
        }

        return direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
}

/**
 * Filter commitments by status
 */
function filterCommitments(
    commitments: Commitment[],
    status: FilterStatus
): Commitment[] {
    if (status === 'all') return commitments;
    return commitments.filter((c) => c.status === status);
}

/**
 * CommitmentList - Displays all user commitments
 *
 * Features:
 * - Filter by status (all, active, completed, failed, expired)
 * - Sort by deadline, stake amount, or creation date
 * - Empty state with call to action
 * - Loading skeleton state
 * - Responsive grid layout
 * - Requirement 7.1: Display all active commitments
 * - Requirement 7.2: Show topic, stake, deadline, status
 */
export function CommitmentList({
    commitments,
    className,
    showFilters = true,
    onCreateCommitment,
    onTakeExam,
    title = 'Your Commitments',
    isLoading = false,
}: CommitmentListProps) {
    const router = useRouter();
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [sortBy, setSortBy] = useState<SortOption>('deadline');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Filter and sort commitments
    const displayedCommitments = useMemo(() => {
        const filtered = filterCommitments(commitments, filterStatus);
        return sortCommitments(filtered, sortBy, sortDirection);
    }, [commitments, filterStatus, sortBy, sortDirection]);

    // Count by status for filter badges
    const statusCounts = useMemo(() => {
        return {
            all: commitments.length,
            active: commitments.filter((c) => c.status === 'active').length,
            completed: commitments.filter((c) => c.status === 'completed').length,
            failed: commitments.filter((c) => c.status === 'failed').length,
            expired: commitments.filter((c) => c.status === 'expired').length,
        };
    }, [commitments]);

    const handleTakeExam = (commitmentId: string) => {
        if (onTakeExam) {
            onTakeExam(commitmentId);
        } else {
            // Default navigation to exam page
            router.push(`/dashboard/burner/commitment/${commitmentId}/exam`);
        }
    };

    const toggleSortDirection = () => {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <div className={cn('space-y-6', className)}>
                <div className="flex items-center justify-between">
                    <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-10 w-32 bg-muted animate-pulse rounded" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-64 bg-muted animate-pulse rounded-xl"
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Empty state
    if (commitments.length === 0) {
        return (
            <div className={cn('space-y-6', className)}>
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">{title}</h2>
                </div>
                <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-xl">
                    <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No commitments yet</h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                        Create your first learning commitment and put some skin in the game.
                        Learn it or lose it!
                    </p>
                    {onCreateCommitment && (
                        <Button onClick={onCreateCommitment}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Commitment
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold">{title}</h2>
                {onCreateCommitment && (
                    <Button onClick={onCreateCommitment}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Commitment
                    </Button>
                )}
            </div>

            {/* Filters and Sort */}
            {showFilters && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <ListFilter className="h-4 w-4 text-muted-foreground" />
                        <Select
                            value={filterStatus}
                            onValueChange={(value) => setFilterStatus(value as FilterStatus)}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All ({statusCounts.all})
                                </SelectItem>
                                <SelectItem value="active">
                                    Active ({statusCounts.active})
                                </SelectItem>
                                <SelectItem value="completed">
                                    Completed ({statusCounts.completed})
                                </SelectItem>
                                <SelectItem value="failed">
                                    Failed ({statusCounts.failed})
                                </SelectItem>
                                <SelectItem value="expired">
                                    Expired ({statusCounts.expired})
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sort Controls */}
                    <div className="flex items-center gap-2">
                        <Select
                            value={sortBy}
                            onValueChange={(value) => setSortBy(value as SortOption)}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="deadline">Deadline</SelectItem>
                                <SelectItem value="stake">Stake Amount</SelectItem>
                                <SelectItem value="created">Created Date</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleSortDirection}
                            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                        >
                            {sortDirection === 'asc' ? (
                                <SortAsc className="h-4 w-4" />
                            ) : (
                                <SortDesc className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Results count */}
            {filterStatus !== 'all' && (
                <p className="text-sm text-muted-foreground">
                    Showing {displayedCommitments.length} of {commitments.length} commitments
                </p>
            )}

            {/* Commitment Grid */}
            {displayedCommitments.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {displayedCommitments.map((commitment) => (
                        <CommitmentCard
                            key={commitment.id}
                            commitment={commitment}
                            onTakeExam={handleTakeExam}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 border rounded-xl bg-muted/30">
                    <p className="text-muted-foreground text-center">
                        No {filterStatus} commitments found.
                    </p>
                    <Button
                        variant="link"
                        onClick={() => setFilterStatus('all')}
                        className="mt-2"
                    >
                        Show all commitments
                    </Button>
                </div>
            )}
        </div>
    );
}
