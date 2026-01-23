'use server';

/**
 * Commitment Server Actions
 * Server-side actions for managing learning commitments
 * Requirements: 2.1, 2.2, 2.6
 */

import { auth } from '@clerk/nextjs/server';
import type { Commitment } from '../types/database';
import {
    createCommitmentSchema,
    type CreateCommitmentInput,
} from '../utils/validation';
import {
    createCommitment as createCommitmentService,
    getActiveCommitmentsByUserId,
    getCommitmentById as getCommitmentByIdService,
} from '../services/commitment-service';
import { ensureUserExists } from './user-actions';

/**
 * Validation error structure
 */
export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

/**
 * Action result type for server actions
 */
export interface ActionResult<T> {
    success: boolean;
    data?: T;
    errors?: ValidationError[];
}

/**
 * Parse FormData to CreateCommitmentInput
 * @param formData - Form data from the client
 * @returns Parsed input object
 */
function parseFormData(formData: FormData): Record<string, unknown> {
    const topic = formData.get('topic');
    const stakeAmount = formData.get('stakeAmount');
    const durationDays = formData.get('durationDays');

    return {
        topic: typeof topic === 'string' ? topic.trim() : '',
        stakeAmount:
            typeof stakeAmount === 'string' ? parseFloat(stakeAmount) : 0,
        durationDays:
            typeof durationDays === 'string' ? parseInt(durationDays, 10) : 0,
    };
}

/**
 * Convert Zod errors to ValidationError array
 * @param zodError - Zod validation error
 * @returns Array of validation errors
 */
function formatZodErrors(
    zodError: import('zod').core.$ZodError
): ValidationError[] {
    return zodError.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
    }));
}

/**
 * Create a new learning commitment
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 *
 * @param formData - Form data containing topic, stakeAmount, durationDays
 * @returns ActionResult with created commitment or validation errors
 */
export async function createCommitment(
    formData: FormData
): Promise<ActionResult<Commitment>> {
    try {
        // Get authenticated user
        const { userId } = await auth();

        if (!userId) {
            return {
                success: false,
                errors: [
                    {
                        field: 'auth',
                        message: 'You must be signed in to create a commitment',
                        code: 'unauthorized',
                    },
                ],
            };
        }

        // Ensure user exists in Supabase before creating commitment
        const userExists = await ensureUserExists();
        if (!userExists) {
            return {
                success: false,
                errors: [
                    {
                        field: 'auth',
                        message: 'Failed to sync user profile. Please try again.',
                        code: 'user_sync_failed',
                    },
                ],
            };
        }

        // Parse form data
        const rawInput = parseFormData(formData);

        // Validate input using Zod schema
        const validationResult = createCommitmentSchema.safeParse(rawInput);

        if (!validationResult.success) {
            return {
                success: false,
                errors: formatZodErrors(validationResult.error),
            };
        }

        const validatedInput: CreateCommitmentInput = validationResult.data;

        // Create commitment using service
        const commitment = await createCommitmentService({
            ...validatedInput,
            userId,
        });

        return {
            success: true,
            data: commitment,
        };
    } catch (error) {
        console.error('Error creating commitment:', error);
        return {
            success: false,
            errors: [
                {
                    field: 'server',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'An unexpected error occurred',
                    code: 'server_error',
                },
            ],
        };
    }
}

/**
 * Get all active commitments for the current user
 * Requirement 7.1: Display all active commitments
 *
 * @returns Array of active commitments
 */
export async function getActiveCommitments(): Promise<Commitment[]> {
    try {
        // Get authenticated user
        const { userId } = await auth();

        if (!userId) {
            return [];
        }

        // Ensure user exists in Supabase
        await ensureUserExists();

        // Fetch active commitments using service
        const commitments = await getActiveCommitmentsByUserId(userId);

        return commitments;
    } catch (error) {
        console.error('Error fetching active commitments:', error);
        return [];
    }
}

/**
 * Get a commitment by ID
 * Only returns the commitment if it belongs to the current user
 *
 * @param id - Commitment ID
 * @returns Commitment or null if not found or unauthorized
 */
export async function getCommitmentById(id: string): Promise<Commitment | null> {
    try {
        // Get authenticated user
        const { userId } = await auth();

        if (!userId) {
            return null;
        }

        // Fetch commitment using service
        const commitment = await getCommitmentByIdService(id);

        // Verify ownership
        if (!commitment || commitment.user_id !== userId) {
            return null;
        }

        return commitment;
    } catch (error) {
        console.error('Error fetching commitment:', error);
        return null;
    }
}
