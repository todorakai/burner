'use client';

/**
 * Burner Dashboard Page
 * Main page for the Burner learning accountability feature
 * Requirements: 7.1, 7.2, 7.4
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Flame, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

import { CommitmentForm, CommitmentList } from '@/features/burner/components/commitment';
import { getActiveCommitments } from '@/features/burner/actions/commitment-actions';
import type { Commitment } from '@/features/burner/types/database';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function BurnerDashboardPage() {
    const router = useRouter();
    const [commitments, setCommitments] = useState<Commitment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const loadCommitments = useCallback(async () => {
        try {
            const data = await getActiveCommitments();
            setCommitments(data);
        } catch (error) {
            console.error('Failed to load commitments:', error);
            toast.error('Failed to load commitments');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCommitments();
    }, [loadCommitments]);

    const handleCreateSuccess = () => {
        setIsDialogOpen(false);
        loadCommitments();
    };

    const handleTakeExam = (commitmentId: string) => {
        router.push(`/dashboard/burner/commitment/${commitmentId}`);
    };

    // Calculate stats
    const totalStaked = commitments.reduce((sum, c) => sum + c.stake_amount, 0);
    const stakesSaved = commitments
        .filter(c => c.stake_status === 'saved')
        .reduce((sum, c) => sum + c.stake_amount, 0);
    const stakesBurned = commitments
        .filter(c => c.stake_status === 'burned')
        .reduce((sum, c) => sum + c.stake_amount, 0);
    const activeCount = commitments.filter(c => c.status === 'active').length;

    return (
        <div className="space-y-8 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Flame className="h-8 w-8 text-orange-500" />
                        Burner
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Learn it or lose it. Stake your commitment.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Commitment
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create Learning Commitment</DialogTitle>
                        </DialogHeader>
                        <CommitmentForm
                            onSuccess={handleCreateSuccess}
                            onCancel={() => setIsDialogOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Staked</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalStaked)}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeCount} active commitment{activeCount !== 1 ? 's' : ''}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Stakes Saved</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(stakesSaved)}</div>
                        <p className="text-xs text-muted-foreground">
                            From passed exams
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Stakes Burned</CardTitle>
                        <TrendingDown className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{formatCurrency(stakesBurned)}</div>
                        <p className="text-xs text-muted-foreground">
                            From failed/expired
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                        <Flame className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {formatCurrency(totalStaked - stakesSaved - stakesBurned)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Prove your learning!
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Commitments List */}
            <CommitmentList
                commitments={commitments}
                isLoading={isLoading}
                onCreateCommitment={() => setIsDialogOpen(true)}
                onTakeExam={handleTakeExam}
            />
        </div>
    );
}
