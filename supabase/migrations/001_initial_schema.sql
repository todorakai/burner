-- Burner Learning Accountability App - Initial Schema
-- Migration: 001_initial_schema.sql
-- Requirements: 10.1, 10.2, 10.3

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- Stores user profiles synced from Clerk authentication
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,                    -- Matches Clerk user ID
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- COMMITMENTS TABLE
-- Stores learning commitments with stakes
-- ============================================================================
CREATE TABLE IF NOT EXISTS commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    stake_amount NUMERIC(10, 2) NOT NULL CHECK (stake_amount >= 1 AND stake_amount <= 1000),
    duration_days INTEGER NOT NULL CHECK (duration_days >= 1 AND duration_days <= 90),
    deadline TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'expired')),
    stake_status TEXT NOT NULL DEFAULT 'at_risk' CHECK (stake_status IN ('at_risk', 'saved', 'burned')),
    retry_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user_id lookups (common query pattern)
CREATE INDEX IF NOT EXISTS idx_commitments_user_id ON commitments(user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_commitments_status ON commitments(status);

-- Index for deadline queries (finding expired commitments)
CREATE INDEX IF NOT EXISTS idx_commitments_deadline ON commitments(deadline);

-- Composite index for user's active commitments
CREATE INDEX IF NOT EXISTS idx_commitments_user_status ON commitments(user_id, status);

-- ============================================================================
-- EXAMS TABLE
-- Stores AI-generated exams for commitments
-- ============================================================================
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
    questions JSONB NOT NULL,               -- Array of ExamQuestion objects
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'graded', 'grading_failed')),
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    overall_score NUMERIC(5, 2) CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
    passed BOOLEAN,
    opik_trace_id TEXT,                     -- For linking to Opik dashboard
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for commitment_id lookups
CREATE INDEX IF NOT EXISTS idx_exams_commitment_id ON exams(commitment_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);

-- Index for Opik trace lookups
CREATE INDEX IF NOT EXISTS idx_exams_opik_trace_id ON exams(opik_trace_id) WHERE opik_trace_id IS NOT NULL;

-- ============================================================================
-- EXAM_ANSWERS TABLE
-- Stores user answers and grading results for each exam question
-- ============================================================================
CREATE TABLE IF NOT EXISTS exam_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,              -- References ExamQuestion.id in JSONB
    user_answer TEXT NOT NULL,
    score NUMERIC(5, 2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    feedback TEXT,
    graded_at TIMESTAMPTZ,
    opik_span_id TEXT,                      -- For linking to Opik span
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for exam_id lookups
CREATE INDEX IF NOT EXISTS idx_exam_answers_exam_id ON exam_answers(exam_id);

-- Composite index for finding specific answer by exam and question
CREATE INDEX IF NOT EXISTS idx_exam_answers_exam_question ON exam_answers(exam_id, question_id);

-- Index for Opik span lookups
CREATE INDEX IF NOT EXISTS idx_exam_answers_opik_span_id ON exam_answers(opik_span_id) WHERE opik_span_id IS NOT NULL;

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically updates the updated_at timestamp on row modification
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to commitments table
DROP TRIGGER IF EXISTS update_commitments_updated_at ON commitments;
CREATE TRIGGER update_commitments_updated_at
    BEFORE UPDATE ON commitments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to exams table
DROP TRIGGER IF EXISTS update_exams_updated_at ON exams;
CREATE TRIGGER update_exams_updated_at
    BEFORE UPDATE ON exams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE users IS 'User profiles synced from Clerk authentication';
COMMENT ON TABLE commitments IS 'Learning commitments with stakes and deadlines';
COMMENT ON TABLE exams IS 'AI-generated exams for testing learning commitments';
COMMENT ON TABLE exam_answers IS 'User answers and AI grading results for exam questions';

COMMENT ON COLUMN commitments.stake_amount IS 'Mock stake in dollars (1-1000)';
COMMENT ON COLUMN commitments.duration_days IS 'Learning duration (1-90 days)';
COMMENT ON COLUMN commitments.deadline IS 'Calculated: created_at + duration_days';
COMMENT ON COLUMN commitments.stake_status IS 'at_risk (active), saved (passed), burned (failed/expired)';
COMMENT ON COLUMN commitments.retry_used IS 'Whether the user has used their one retry attempt';

COMMENT ON COLUMN exams.questions IS 'JSONB array of ExamQuestion objects with id, type, question, options, correct_answer, difficulty';
COMMENT ON COLUMN exams.opik_trace_id IS 'Links to Opik dashboard for LLM observability';

COMMENT ON COLUMN exam_answers.question_id IS 'References ExamQuestion.id in the exams.questions JSONB';
COMMENT ON COLUMN exam_answers.opik_span_id IS 'Links to Opik span for grading observability';
