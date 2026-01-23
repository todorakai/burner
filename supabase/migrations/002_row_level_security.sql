-- Burner Learning Accountability App - Row Level Security
-- Migration: 002_row_level_security.sql
-- Requirements: 10.4
-- Property 9: Data Isolation Security - Users can only access their own data

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- Users can only read and update their own user record
-- ============================================================================

-- Policy: Users can read their own profile
CREATE POLICY "users_select_own"
    ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "users_update_own"
    ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile (for initial sync from Clerk)
CREATE POLICY "users_insert_own"
    ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Note: DELETE is intentionally not allowed for users table
-- User deletion should be handled through admin processes

-- ============================================================================
-- COMMITMENTS TABLE POLICIES
-- Users can only CRUD their own commitments
-- ============================================================================

-- Policy: Users can read their own commitments
CREATE POLICY "commitments_select_own"
    ON commitments
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can create commitments for themselves
CREATE POLICY "commitments_insert_own"
    ON commitments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own commitments
CREATE POLICY "commitments_update_own"
    ON commitments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own commitments
CREATE POLICY "commitments_delete_own"
    ON commitments
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- EXAMS TABLE POLICIES
-- Users can only CRUD exams for their own commitments
-- ============================================================================

-- Policy: Users can read exams for their own commitments
CREATE POLICY "exams_select_own"
    ON exams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM commitments
            WHERE commitments.id = exams.commitment_id
            AND commitments.user_id = auth.uid()
        )
    );

-- Policy: Users can create exams for their own commitments
CREATE POLICY "exams_insert_own"
    ON exams
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM commitments
            WHERE commitments.id = commitment_id
            AND commitments.user_id = auth.uid()
        )
    );

-- Policy: Users can update exams for their own commitments
CREATE POLICY "exams_update_own"
    ON exams
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM commitments
            WHERE commitments.id = exams.commitment_id
            AND commitments.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM commitments
            WHERE commitments.id = commitment_id
            AND commitments.user_id = auth.uid()
        )
    );

-- Policy: Users can delete exams for their own commitments
CREATE POLICY "exams_delete_own"
    ON exams
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM commitments
            WHERE commitments.id = exams.commitment_id
            AND commitments.user_id = auth.uid()
        )
    );

-- ============================================================================
-- EXAM_ANSWERS TABLE POLICIES
-- Users can only CRUD exam_answers for their own exams
-- ============================================================================

-- Policy: Users can read answers for their own exams
CREATE POLICY "exam_answers_select_own"
    ON exam_answers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM exams
            JOIN commitments ON commitments.id = exams.commitment_id
            WHERE exams.id = exam_answers.exam_id
            AND commitments.user_id = auth.uid()
        )
    );

-- Policy: Users can create answers for their own exams
CREATE POLICY "exam_answers_insert_own"
    ON exam_answers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exams
            JOIN commitments ON commitments.id = exams.commitment_id
            WHERE exams.id = exam_id
            AND commitments.user_id = auth.uid()
        )
    );

-- Policy: Users can update answers for their own exams
CREATE POLICY "exam_answers_update_own"
    ON exam_answers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM exams
            JOIN commitments ON commitments.id = exams.commitment_id
            WHERE exams.id = exam_answers.exam_id
            AND commitments.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exams
            JOIN commitments ON commitments.id = exams.commitment_id
            WHERE exams.id = exam_id
            AND commitments.user_id = auth.uid()
        )
    );

-- Policy: Users can delete answers for their own exams
CREATE POLICY "exam_answers_delete_own"
    ON exam_answers
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM exams
            JOIN commitments ON commitments.id = exams.commitment_id
            WHERE exams.id = exam_answers.exam_id
            AND commitments.user_id = auth.uid()
        )
    );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "users_select_own" ON users IS 'Users can only read their own profile';
COMMENT ON POLICY "users_update_own" ON users IS 'Users can only update their own profile';
COMMENT ON POLICY "users_insert_own" ON users IS 'Users can only insert their own profile';

COMMENT ON POLICY "commitments_select_own" ON commitments IS 'Users can only read their own commitments';
COMMENT ON POLICY "commitments_insert_own" ON commitments IS 'Users can only create commitments for themselves';
COMMENT ON POLICY "commitments_update_own" ON commitments IS 'Users can only update their own commitments';
COMMENT ON POLICY "commitments_delete_own" ON commitments IS 'Users can only delete their own commitments';

COMMENT ON POLICY "exams_select_own" ON exams IS 'Users can only read exams for their own commitments';
COMMENT ON POLICY "exams_insert_own" ON exams IS 'Users can only create exams for their own commitments';
COMMENT ON POLICY "exams_update_own" ON exams IS 'Users can only update exams for their own commitments';
COMMENT ON POLICY "exams_delete_own" ON exams IS 'Users can only delete exams for their own commitments';

COMMENT ON POLICY "exam_answers_select_own" ON exam_answers IS 'Users can only read answers for their own exams';
COMMENT ON POLICY "exam_answers_insert_own" ON exam_answers IS 'Users can only create answers for their own exams';
COMMENT ON POLICY "exam_answers_update_own" ON exam_answers IS 'Users can only update answers for their own exams';
COMMENT ON POLICY "exam_answers_delete_own" ON exam_answers IS 'Users can only delete answers for their own exams';
