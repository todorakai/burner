/**
 * Commitment Service
 * Business logic for managing learning commitments
 * Requirements: 2.1, 2.2, 2.6
 */

import type {
    Commitment,
    CommitmentStatus,
    Database,
    StakeStatus,
} from '../types/database';
import type { CreateCommitmentInput } from '../utils/validation';
import { createServiceClient } from './supabase';

/**
 * Service interface for commitment operations
 */
export interface CommitmentService {
    create(data: CreateCommitmentInput & { userId: string }): Promise<Commitment>;
    getByUserId(userId: string): Promise<Commitment[]>;
    getById(id: string): Promise<Commitment | null>;
    updateStatus(id: string, status: CommitmentStatus): Promise<Commitment>;
    getActiveByUserId(userId: string): Promise<Commitment[]>;
}

/**
 * Calculate deadline from duration days
 * Requirement 2.6: Calculate and store deadline based on creation time plus duration
 * @param durationDays - Number of days for the commitment
 * @returns ISO timestamp string for the deadline
 */
export function calculateDeadline(durationDays: number): string {
    const deadline = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    return deadline.toISOString();
}

// Type alias for commitment insert
type CommitmentInsertData = Database['public']['Tables']['commitments']['Insert'];
type CommitmentUpdateData = Database['public']['Tables']['commitments']['Update'];

/**
 * Create a new commitment
 * Requirements: 2.1, 2.2, 2.6
 * @param data - Commitment creation data including userId
 * @returns Created commitment
 */
export async function createCommitment(
    data: CreateCommitmentInput & { userId: string }
): Promise<Commitment> {
    const supabase = createServiceClient();

    const deadline = calculateDeadline(data.durationDays);

    const commitmentData: CommitmentInsertData = {
        user_id: data.userId,
        topic: data.topic,
        stake_amount: data.stakeAmount,
        duration_days: data.durationDays,
        deadline,
        status: 'active',
        stake_status: 'at_risk',
        retry_used: false,
    };

    const { data: commitment, error } = await supabase
        .from('commitments')
        .insert(commitmentData as never)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create commitment: ${error.message}`);
    }

    return commitment as Commitment;
}

/**
 * Get all commitments for a user
 * @param userId - User ID to fetch commitments for
 * @returns Array of commitments
 */
export async function getCommitmentsByUserId(
    userId: string
): Promise<Commitment[]> {
    const supabase = createServiceClient();

    const { data: commitments, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch commitments: ${error.message}`);
    }

    return (commitments as Commitment[]) || [];
}

/**
 * Get active commitments for a user
 * Requirement 7.1: Display all active commitments
 * @param userId - User ID to fetch active commitments for
 * @returns Array of active commitments
 */
export async function getActiveCommitmentsByUserId(
    userId: string
): Promise<Commitment[]> {
    const supabase = createServiceClient();

    const { data: commitments, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('deadline', { ascending: true });

    if (error) {
        throw new Error(`Failed to fetch active commitments: ${error.message}`);
    }

    return (commitments as Commitment[]) || [];
}

/**
 * Get a commitment by ID
 * @param id - Commitment ID
 * @returns Commitment or null if not found
 */
export async function getCommitmentById(
    id: string
): Promise<Commitment | null> {
    const supabase = createServiceClient();

    const { data: commitment, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No rows returned
            return null;
        }
        throw new Error(`Failed to fetch commitment: ${error.message}`);
    }

    return commitment as Commitment;
}

/**
 * Update commitment status
 * @param id - Commitment ID
 * @param status - New status
 * @returns Updated commitment
 */
export async function updateCommitmentStatus(
    id: string,
    status: CommitmentStatus
): Promise<Commitment> {
    const supabase = createServiceClient();

    const updateData: CommitmentUpdateData = { status };

    const { data: commitment, error } = await supabase
        .from('commitments')
        .update(updateData as never)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update commitment status: ${error.message}`);
    }

    return commitment as Commitment;
}

/**
 * Update commitment stake status
 * @param id - Commitment ID
 * @param stakeStatus - New stake status
 * @returns Updated commitment
 */
export async function updateCommitmentStakeStatus(
    id: string,
    stakeStatus: StakeStatus
): Promise<Commitment> {
    const supabase = createServiceClient();

    const updateData: CommitmentUpdateData = { stake_status: stakeStatus };

    const { data: commitment, error } = await supabase
        .from('commitments')
        .update(updateData as never)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update stake status: ${error.message}`);
    }

    return commitment as Commitment;
}

/**
 * Update commitment retry status
 * @param id - Commitment ID
 * @param retryUsed - Whether retry has been used
 * @returns Updated commitment
 */
export async function updateCommitmentRetryUsed(
    id: string,
    retryUsed: boolean
): Promise<Commitment> {
    const supabase = createServiceClient();

    const updateData: CommitmentUpdateData = { retry_used: retryUsed };

    const { data: commitment, error } = await supabase
        .from('commitments')
        .update(updateData as never)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update retry status: ${error.message}`);
    }

    return commitment as Commitment;
}

/**
 * Commitment service object implementing the CommitmentService interface
 */
export const commitmentService: CommitmentService = {
    create: createCommitment,
    getByUserId: getCommitmentsByUserId,
    getById: getCommitmentById,
    updateStatus: updateCommitmentStatus,
    getActiveByUserId: getActiveCommitmentsByUserId,
};
