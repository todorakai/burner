'use client';

/**
 * User Sync Provider
 * Automatically syncs Clerk users to Supabase on authentication
 * Requirements: 1.2 - Create or retrieve user profile from Supabase on successful auth
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useUserSync, type UseUserSyncState } from '../../hooks/use-user-sync';

/**
 * Context for user sync state
 */
const UserSyncContext = createContext<UseUserSyncState | null>(null);

/**
 * Props for UserSyncProvider
 */
export interface UserSyncProviderProps {
    children: ReactNode;
}

/**
 * Provider component that automatically syncs Clerk users to Supabase
 * 
 * Wrap your app or protected routes with this provider to ensure
 * users are synced to Supabase when they authenticate.
 * 
 * Usage:
 * ```tsx
 * // In your layout or app
 * <UserSyncProvider>
 *   <YourApp />
 * </UserSyncProvider>
 * 
 * // In child components
 * const { user, isSynced, isLoading } = useUserSyncContext();
 * ```
 */
export function UserSyncProvider({ children }: UserSyncProviderProps) {
    const syncState = useUserSync();

    return (
        <UserSyncContext.Provider value={syncState}>
            {children}
        </UserSyncContext.Provider>
    );
}

/**
 * Hook to access user sync context
 * Must be used within a UserSyncProvider
 * 
 * @returns UseUserSyncState with user profile and sync status
 * @throws Error if used outside of UserSyncProvider
 */
export function useUserSyncContext(): UseUserSyncState {
    const context = useContext(UserSyncContext);

    if (!context) {
        throw new Error(
            'useUserSyncContext must be used within a UserSyncProvider'
        );
    }

    return context;
}

/**
 * Component that renders children only when user is synced
 * Useful for protecting content that requires a synced user
 * 
 * Usage:
 * ```tsx
 * <UserSyncGate
 *   loadingFallback={<Spinner />}
 *   errorFallback={<ErrorMessage />}
 *   unsyncedFallback={<SignInPrompt />}
 * >
 *   <ProtectedContent />
 * </UserSyncGate>
 * ```
 */
export interface UserSyncGateProps {
    children: ReactNode;
    /** Content to show while syncing */
    loadingFallback?: ReactNode;
    /** Content to show if sync fails */
    errorFallback?: ReactNode;
    /** Content to show if user is not synced (not signed in) */
    unsyncedFallback?: ReactNode;
}

export function UserSyncGate({
    children,
    loadingFallback = null,
    errorFallback = null,
    unsyncedFallback = null,
}: UserSyncGateProps) {
    const { isLoading, isSynced, error } = useUserSyncContext();

    if (isLoading) {
        return <>{loadingFallback}</>;
    }

    if (error) {
        return <>{errorFallback}</>;
    }

    if (!isSynced) {
        return <>{unsyncedFallback}</>;
    }

    return <>{children}</>;
}
