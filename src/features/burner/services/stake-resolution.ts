/**
 * Stake Resolution Service
 * Handles stake status changes based on exam results
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import type { Commitment, CommitmentStatus, StakeStatus, Database } from '../types/database';
import { createServiceClient } from './supabase';

type CommitmentUpdateData = Database['public']['Tables']['commitments']['Update'];

export interface StakeResolutionResult {
    commitment: Commitment;
    previousStatus: CommitmentStatus;
    previousStakeStatus: StakeStatus;
    action: 'saved' | 'burned' | 'retry_allowed' | 'no_change';
    message: string;
}

/**
 * Resolve stake based on exam result
 * Requirements:
 * - 6.1: Pass before deadline → completed/saved
 * - 6.2: Fail with retry available → allow retry
 * - 6.3: Fail after retry → failed/burned
 * - 6.4: Deadline passed → expired/burned
 */
export async function resolveStake(
    commitmentId: string,
    passed: boolean
): Promise<StakeResolutionResult> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('id', commitmentId)
        .single();

    if (error || !data) {
        throw new Error('Commitment not found');
    }

    const commitment = data as Commitment;
    const previousStatus = commitment.status;
    const previousStakeStatus = commitment.stake_status;

    // Check if deadline has passed
    const deadline = new Date(commitment.deadline);
    const now = new Date();
    const deadlinePassed = now > deadline;

    let newStatus: CommitmentStatus = commitment.status;
    let newStakeStatus: StakeStatus = commitment.stake_status;
    let newRetryUsed = commitment.retry_used;
    let action: StakeResolutionResult['action'] = 'no_change';
    let message = '';

    if (deadlinePassed && commitment.status === 'active') {
        // 6.4: Deadline passed without passing exam
        newStatus = 'expired';
        newStakeStatus = 'burned';
        action = 'burned';
        message = 'Deadline passed. Stake has been burned.';
    } else if (passed) {
        // 6.1: User passed the exam
        newStatus = 'completed';
        newStakeStatus = 'saved';
        action = 'saved';
        message = 'Congratulations! You passed and saved your stake.';
    } else if (!commitment.retry_used) {
        // 6.2: User failed but has retry available
        newRetryUsed = true;
        action = 'retry_allowed';
        message = 'You did not pass. You have one retry remaining.';
    } else {
        // 6.3: User failed after using retry
        newStatus = 'failed';
        newStakeStatus = 'burned';
        action = 'burned';
        message = 'You did not pass after retry. Stake has been burned.';
    }

    // Update commitment if there are changes
    if (newStatus !== commitment.status || newStakeStatus !== commitment.stake_status || newRetryUsed !== commitment.retry_used) {
        const updateData: CommitmentUpdateData = {
            status: newStatus,
            stake_status: newStakeStatus,
            retry_used: newRetryUsed,
        };

        const { data: updated, error: updateError } = await supabase
            .from('commitments')
            .update(updateData as never)
            .eq('id', commitmentId)
            .select()
            .single();

        if (updateError || !updated) {
            throw new Error('Failed to update commitment');
        }

        return {
            commitment: updated as Commitment,
            previousStatus,
            previousStakeStatus,
            action,
            message,
        };
    }

    return {
        commitment,
        previousStatus,
        previousStakeStatus,
        action,
        message,
    };
}

/**
 * Check and expire commitments that have passed their deadline
 */
export async function expireOverdueCommitments(userId: string): Promise<Commitment[]> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .lt('deadline', new Date().toISOString());

    if (error || !data) {
        return [];
    }

    const expiredCommitments: Commitment[] = [];

    for (const commitment of data as Commitment[]) {
        const updateData: CommitmentUpdateData = {
            status: 'expired',
            stake_status: 'burned',
        };

        const { data: updated } = await supabase
            .from('commitments')
            .update(updateData as never)
            .eq('id', commitment.id)
            .select()
            .single();

        if (updated) {
            expiredCommitments.push(updated as Commitment);
        }
    }

    return expiredCommitments;
}

export const stakeResolutionService = {
    resolveStake,
    expireOverdueCommitments,
};
