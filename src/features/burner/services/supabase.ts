/**
 * Supabase Client for Burner Feature
 * Provides typed Supabase client for database operations
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Environment variables for Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

/**
 * Public Supabase client for client-side operations
 * Uses anon key with RLS policies
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Creates a Supabase client with service role key for server-side operations
 * Bypasses RLS - use only in server actions with proper auth checks
 */
export function createServiceClient() {
    if (!supabaseServiceKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    }
    return createClient<Database>(supabaseUrl!, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

/**
 * Creates a Supabase client for server-side operations with user context
 * Uses anon key but allows passing user context for RLS
 */
export function createServerClient() {
    return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
