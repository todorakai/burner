'use client';

/**
 * User Sync Hook
 * React hook for syncing Clerk users to Supabase
 * Requirements: 1.2 - Create or retrieve user profile from Supabase on successful auth
 */

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { syncCurrentUser, getCurrentUserProfile } from '../actions/user-actions';
import type { User } from '../types/database';

/**
 * State for the user sync hook
 */
export interface UseUserSyncState {
    /** The synced Supabase user profile */
    user: User | null;
    /** Whether the sync is in progress */
    isLoading: boolean;
    /** Whether the user has been synced successfully */
    isSynced: boolean;
    /** Any error that occurred during sync */
    error: string | null;
    /** Function to manually trigger a sync */
    sync: () => Promise<void>;
}

/**
 * Hook to automatically sync Clerk users to Supabase
 * 
 * This hook:
 * 1. Watches for Clerk authentication state changes
 * 2. Automatically syncs the user to Supabase when they sign in
 * 3. Provides the synced user profile and sync status
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { user, isLoading, isSynced, error } = useUserSync();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   if (!isSynced) return <div>Not synced</div>;
 *   
 *   return <div>Welcome, {user?.email}</div>;
 * }
 * ```
 * 
 * @returns UseUserSyncState with user profile and sync status
 */
export function useUserSync(): UseUserSyncState {
    const { isSignedIn, isLoaded: isClerkLoaded, user: clerkUser } = useUser();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSynced, setIsSynced] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Perform the user sync
     */
    const sync = useCallback(async () => {
        if (!isSignedIn || !clerkUser) {
            setUser(null);
            setIsSynced(false);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Sync the user to Supabase
            const result = await syncCurrentUser();

            if (result.success && result.data) {
                setUser(result.data);
                setIsSynced(true);
            } else {
                setError(result.error || 'Failed to sync user');
                setIsSynced(false);
            }
        } catch (err) {
            console.error('Error in useUserSync:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setIsSynced(false);
        } finally {
            setIsLoading(false);
        }
    }, [isSignedIn, clerkUser]);

    /**
     * Effect to sync user when Clerk auth state changes
     */
    useEffect(() => {
        // Wait for Clerk to load
        if (!isClerkLoaded) {
            return;
        }

        // If not signed in, clear state
        if (!isSignedIn) {
            setUser(null);
            setIsSynced(false);
            setIsLoading(false);
            setError(null);
            return;
        }

        // Sync the user
        sync();
    }, [isClerkLoaded, isSignedIn, clerkUser?.id, sync]);

    return {
        user,
        isLoading: !isClerkLoaded || isLoading,
        isSynced,
        error,
        sync,
    };
}

/**
 * Hook to get the current user profile without triggering a sync
 * Useful when you just need to read the user data
 * 
 * @returns The user profile state
 */
export function useUserProfile(): {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
} {
    const { isSignedIn, isLoaded: isClerkLoaded } = useUser();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (!isSignedIn) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await getCurrentUserProfile();

            if (result.success && result.data) {
                setUser(result.data);
            } else {
                setError(result.error || 'Failed to get user profile');
            }
        } catch (err) {
            console.error('Error in useUserProfile:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [isSignedIn]);

    useEffect(() => {
        if (!isClerkLoaded) {
            return;
        }

        if (!isSignedIn) {
            setUser(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        refetch();
    }, [isClerkLoaded, isSignedIn, refetch]);

    return {
        user,
        isLoading: !isClerkLoaded || isLoading,
        error,
        refetch,
    };
}
