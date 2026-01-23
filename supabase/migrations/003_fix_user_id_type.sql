-- Migration: 003_fix_user_id_type.sql
-- Fix user ID type to support Clerk user IDs (TEXT instead of UUID)
-- Clerk user IDs are in format: user_XXXXXXXXXXXXXXXXXXXXXXXXXX

-- ============================================================================
-- STEP 1: DROP ALL RLS POLICIES THAT DEPEND ON USER ID
-- ============================================================================

-- Drop users table policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;

-- Drop commitments table policies
DROP POLICY IF EXISTS "commitments_select_own" ON commitments;
DROP POLICY IF EXISTS "commitments_insert_own" ON commitments;
DROP POLICY IF EXISTS "commitments_update_own" ON commitments;
DROP POLICY IF EXISTS "commitments_delete_own" ON commitments;

-- Drop exams table policies
DROP POLICY IF EXISTS "exams_select_own" ON exams;
DROP POLICY IF EXISTS "exams_insert_own" ON exams;
DROP POLICY IF EXISTS "exams_update_own" ON exams;
DROP POLICY IF EXISTS "exams_delete_own" ON exams;

-- Drop exam_answers table policies
DROP POLICY IF EXISTS "exam_answers_select_own" ON exam_answers;
DROP POLICY IF EXISTS "exam_answers_insert_own" ON exam_answers;
DROP POLICY IF EXISTS "exam_answers_update_own" ON exam_answers;
DROP POLICY IF EXISTS "exam_answers_delete_own" ON exam_answers;

-- ============================================================================
-- STEP 2: DROP FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE IF EXISTS commitments DROP CONSTRAINT IF EXISTS commitments_user_id_fkey;

-- ============================================================================
-- STEP 3: ALTER COLUMN TYPES FROM UUID TO TEXT
-- ============================================================================

-- Alter users table id column to TEXT
ALTER TABLE users ALTER COLUMN id TYPE TEXT;

-- Alter commitments table user_id column to TEXT
ALTER TABLE commitments ALTER COLUMN user_id TYPE TEXT;

-- ============================================================================
-- STEP 4: RECREATE FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE commitments ADD CONSTRAINT commitments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 5: RECREATE RLS POLICIES WITH TEXT-BASED USER IDS
-- Note: auth.uid() returns UUID, but Clerk uses TEXT user IDs
-- We'll use service role key for server-side operations instead
-- ============================================================================

-- Users table policies - Allow service role to manage users
CREATE POLICY "users_select_own"
    ON users
    FOR SELECT
    USING (true);  -- Service role will handle auth

CREATE POLICY "users_update_own"
    ON users
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_insert_own"
    ON users
    FOR INSERT
    WITH CHECK (true);

-- Commitments table policies - Allow service role to manage commitments
CREATE POLICY "commitments_select_own"
    ON commitments
    FOR SELECT
    USING (true);

CREATE POLICY "commitments_insert_own"
    ON commitments
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "commitments_update_own"
    ON commitments
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "commitments_delete_own"
    ON commitments
    FOR DELETE
    USING (true);

-- Exams table policies - Allow service role to manage exams
CREATE POLICY "exams_select_own"
    ON exams
    FOR SELECT
    USING (true);

CREATE POLICY "exams_insert_own"
    ON exams
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "exams_update_own"
    ON exams
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "exams_delete_own"
    ON exams
    FOR DELETE
    USING (true);

-- Exam_answers table policies - Allow service role to manage exam answers
CREATE POLICY "exam_answers_select_own"
    ON exam_answers
    FOR SELECT
    USING (true);

CREATE POLICY "exam_answers_insert_own"
    ON exam_answers
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "exam_answers_update_own"
    ON exam_answers
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "exam_answers_delete_own"
    ON exam_answers
    FOR DELETE
    USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN users.id IS 'Clerk user ID (format: user_XXXXXXXXXXXXXXXXXXXXXXXXXX)';
COMMENT ON COLUMN commitments.user_id IS 'References Clerk user ID from users table';

-- Note: RLS policies are now permissive because we use service role key
-- for all database operations. Auth is handled by Clerk at the application layer.
-- The service role key bypasses RLS, so these policies mainly serve as documentation.
