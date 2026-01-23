'use server';

/**
 * User Server Actions
 * Server-side actions for user management and Clerk-Supabase sync
 * Requirements: 1.1, 1.2, 1.3
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import type { User } from '../types/database';
import {
    syncUserToSupabase,
    getUserById,
    type UserSyncResult,
    type ClerkUserData,
} from '../services/user-sync';

/**
 * Action result type for user actions
 */
export interface UserActionResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Sync the current authenticated user to Supabase
 * This should be called after successful Clerk authentication
 * 
 * Requirements:
 * - 1.2: Create or retrieve user profile from Supabase on successful auth
 * - Property 10: User Profile Sync
 * 
 * @returns UserActionResult with the synced user or error
 */
export async function syncCurrentUser(): Promise<UserActionResult<User>> {
    try {
        // Get the current authenticated user from Clerk
        const clerkUser = await currentUser();

        if (!clerkUser) {
            return {
                success: false,
                error: 'No authenticated user found',
            };
        }

        // Get primary email from Clerk user
        const primaryEmail = clerkUser.emailAddresses.find(
            (email) => email.id === clerkUser.primaryEmailAddressId
        );

        if (!primaryEmail) {
            return {
                success: false,
                error: 'User has no primary email address',
            };
        }

        // Prepare user data for sync
        const userData: ClerkUserData = {
            userId: clerkUser.id,
            email: primaryEmail.emailAddress,
        };

        // Sync user to Supabase
        const syncResult = await syncUserToSupabase(userData);

        if (!syncResult.success) {
            return {
                success: false,
                error: syncResult.error,
            };
        }

        return {
            success: true,
            data: syncResult.user,
        };
    } catch (error) {
        console.error('Error syncing current user:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Get the current user's profile from Supabase
 * Creates the profile if it doesn't exist
 * 
 * @returns UserActionResult with the user profile or error
 */
export async function getCurrentUserProfile(): Promise<UserActionResult<User>> {
    try {
        const { userId } = await auth();

        if (!userId) {
            return {
                success: false,
                error: 'Not authenticated',
            };
        }

        // Try to get existing user
        const existingUser = await getUserById(userId);

        if (existingUser) {
            return {
                success: true,
                data: existingUser,
            };
        }

        // User doesn't exist in Supabase - sync them
        const syncResult = await syncCurrentUser();

        return syncResult;
    } catch (error) {
        console.error('Error getting current user profile:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Ensure the current user exists in Supabase
 * This is a lightweight check that syncs if needed
 * 
 * @returns true if user exists or was created successfully
 */
export async function ensureUserExists(): Promise<boolean> {
    try {
        const { userId } = await auth();

        if (!userId) {
            return false;
        }

        // Try to get existing user first (faster than full sync)
        const existingUser = await getUserById(userId);

        if (existingUser) {
            return true;
        }

        // User doesn't exist - perform full sync
        const syncResult = await syncCurrentUser();

        return syncResult.success;
    } catch (error) {
        console.error('Error ensuring user exists:', error);
        return false;
    }
}

/**
 * Get user sync status for debugging/monitoring
 * 
 * @returns Information about the user's sync status
 */
export async function getUserSyncStatus(): Promise<{
    authenticated: boolean;
    clerkUserId: string | null;
    supabaseUser: User | null;
    synced: boolean;
}> {
    try {
        const { userId } = await auth();

        if (!userId) {
            return {
                authenticated: false,
                clerkUserId: null,
                supabaseUser: null,
                synced: false,
            };
        }

        const supabaseUser = await getUserById(userId);

        return {
            authenticated: true,
            clerkUserId: userId,
            supabaseUser,
            synced: supabaseUser !== null,
        };
    } catch (error) {
        console.error('Error getting user sync status:', error);
        return {
            authenticated: false,
            clerkUserId: null,
            supabaseUser: null,
            synced: false,
        };
    }
}
