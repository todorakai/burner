/**
 * User Sync Service
 * Handles synchronization of Clerk users to Supabase
 * Requirements: 1.1, 1.2, 1.3
 */

import { createServiceClient } from './supabase';
import type { User, UserInsert, UserUpdate, Database } from '../types/database';

// Type aliases for Supabase operations
type UserInsertData = Database['public']['Tables']['users']['Insert'];
type UserUpdateData = Database['public']['Tables']['users']['Update'];

/**
 * Result of a user sync operation
 */
export interface UserSyncResult {
    success: boolean;
    user?: User;
    created: boolean;
    updated: boolean;
    error?: string;
}

/**
 * Input for syncing a user from Clerk
 */
export interface ClerkUserData {
    userId: string;
    email: string;
}

/**
 * Sync a Clerk user to Supabase
 * Creates a new user if they don't exist, or updates their email if it changed
 * 
 * Requirements:
 * - 1.2: Create or retrieve user profile from Supabase on successful auth
 * - Property 10: User Profile Sync - authenticated users have Supabase profiles
 * 
 * @param clerkUser - User data from Clerk authentication
 * @returns UserSyncResult with the synced user or error
 */
export async function syncUserToSupabase(
    clerkUser: ClerkUserData
): Promise<UserSyncResult> {
    const supabase = createServiceClient();

    try {
        // Check if user already exists in Supabase
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', clerkUser.userId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 is "not found" error, which is expected for new users
            console.error('Error fetching user:', fetchError);
            return {
                success: false,
                created: false,
                updated: false,
                error: `Failed to fetch user: ${fetchError.message}`,
            };
        }

        // User exists - check if email needs updating
        if (existingUser) {
            const user = existingUser as User;
            if (user.email !== clerkUser.email) {
                // Update email
                const updateData: UserUpdateData = {
                    email: clerkUser.email,
                };

                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update(updateData as never)
                    .eq('id', clerkUser.userId)
                    .select()
                    .single();

                if (updateError) {
                    console.error('Error updating user:', updateError);
                    return {
                        success: false,
                        created: false,
                        updated: false,
                        error: `Failed to update user: ${updateError.message}`,
                    };
                }

                return {
                    success: true,
                    user: updatedUser as User,
                    created: false,
                    updated: true,
                };
            }

            // User exists and email is the same - no update needed
            return {
                success: true,
                user: user,
                created: false,
                updated: false,
            };
        }

        // User doesn't exist - create new user
        const insertData: UserInsertData = {
            id: clerkUser.userId,
            email: clerkUser.email,
        };

        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert(insertData as never)
            .select()
            .single();

        if (insertError) {
            console.error('Error creating user:', insertError);
            return {
                success: false,
                created: false,
                updated: false,
                error: `Failed to create user: ${insertError.message}`,
            };
        }

        return {
            success: true,
            user: newUser as User,
            created: true,
            updated: false,
        };
    } catch (error) {
        console.error('Unexpected error in user sync:', error);
        return {
            success: false,
            created: false,
            updated: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Get a user from Supabase by their Clerk user ID
 * 
 * @param userId - Clerk user ID
 * @returns User or null if not found
 */
export async function getUserById(userId: string): Promise<User | null> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // User not found
            return null;
        }
        console.error('Error fetching user by ID:', error);
        throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data as User;
}

/**
 * Get a user from Supabase by their email
 * 
 * @param email - User email
 * @returns User or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // User not found
            return null;
        }
        console.error('Error fetching user by email:', error);
        throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data as User;
}

/**
 * Check if a user exists in Supabase
 * 
 * @param userId - Clerk user ID
 * @returns true if user exists, false otherwise
 */
export async function userExists(userId: string): Promise<boolean> {
    const supabase = createServiceClient();

    const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId);

    if (error) {
        console.error('Error checking user existence:', error);
        return false;
    }

    return (count ?? 0) > 0;
}

/**
 * Delete a user from Supabase
 * Used when a user is deleted from Clerk
 * 
 * @param userId - Clerk user ID
 * @returns true if deletion was successful
 */
export async function deleteUser(userId: string): Promise<boolean> {
    const supabase = createServiceClient();

    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) {
        console.error('Error deleting user:', error);
        return false;
    }

    return true;
}
