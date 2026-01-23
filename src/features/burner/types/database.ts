/**
 * Burner Database Types
 * TypeScript types generated from Supabase schema
 * Requirements: 10.1, 10.2, 10.3
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Status of a learning commitment
 */
export type CommitmentStatus = 'active' | 'completed' | 'failed' | 'expired';

/**
 * Status of the stake associated with a commitment
 */
export type StakeStatus = 'at_risk' | 'saved' | 'burned';

/**
 * Status of an exam through its lifecycle
 */
export type ExamStatus =
    | 'pending'
    | 'in_progress'
    | 'submitted'
    | 'graded'
    | 'grading_failed';

/**
 * Type of exam question
 */
export type QuestionType = 'multiple_choice' | 'short_answer' | 'application';

/**
 * Difficulty level of exam questions
 */
export type QuestionDifficulty = 'intermediate' | 'advanced';

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

/**
 * User profile stored in Supabase
 * Synced from Clerk authentication
 */
export interface User {
    id: string; // UUID, matches Clerk user ID
    email: string;
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
}

/**
 * Learning commitment with stake
 */
export interface Commitment {
    id: string; // UUID
    user_id: string; // FK to User
    topic: string; // Learning topic
    stake_amount: number; // Mock stake in dollars (1-1000)
    duration_days: number; // 1-90 days
    deadline: string; // ISO timestamp, calculated: created_at + duration_days
    status: CommitmentStatus;
    stake_status: StakeStatus;
    retry_used: boolean; // Whether retry has been used
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
}

/**
 * AI-generated exam for a commitment
 */
export interface Exam {
    id: string; // UUID
    commitment_id: string; // FK to Commitment
    questions: ExamQuestion[]; // JSONB array
    status: ExamStatus;
    started_at: string | null; // ISO timestamp
    submitted_at: string | null; // ISO timestamp
    overall_score: number | null; // 0-100
    passed: boolean | null;
    opik_trace_id: string | null; // For linking to Opik dashboard
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
}

/**
 * Individual exam question stored in JSONB
 */
export interface ExamQuestion {
    id: string;
    type: QuestionType;
    question: string;
    options?: string[]; // For multiple choice
    correct_answer?: string; // For multiple choice (stored for reference)
    difficulty: QuestionDifficulty;
}

/**
 * User answer and grading result for an exam question
 */
export interface ExamAnswer {
    id: string; // UUID
    exam_id: string; // FK to Exam
    question_id: string; // References ExamQuestion.id
    user_answer: string;
    score: number | null; // 0-100
    feedback: string | null;
    graded_at: string | null; // ISO timestamp
    opik_span_id: string | null;
    created_at: string; // ISO timestamp
}

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

/**
 * Data required to create a new user
 */
export interface UserInsert {
    id: string; // Must match Clerk user ID
    email: string;
}

/**
 * Data required to create a new commitment
 */
export interface CommitmentInsert {
    user_id: string;
    topic: string;
    stake_amount: number;
    duration_days: number;
    deadline: string; // ISO timestamp
    status?: CommitmentStatus;
    stake_status?: StakeStatus;
    retry_used?: boolean;
}

/**
 * Data required to create a new exam
 */
export interface ExamInsert {
    commitment_id: string;
    questions: ExamQuestion[];
    status?: ExamStatus;
    opik_trace_id?: string | null;
}

/**
 * Data required to create a new exam answer
 */
export interface ExamAnswerInsert {
    exam_id: string;
    question_id: string;
    user_answer: string;
}

// ============================================================================
// UPDATE TYPES (for updating existing records)
// ============================================================================

/**
 * Fields that can be updated on a user
 */
export interface UserUpdate {
    email?: string;
}

/**
 * Fields that can be updated on a commitment
 */
export interface CommitmentUpdate {
    status?: CommitmentStatus;
    stake_status?: StakeStatus;
    retry_used?: boolean;
}

/**
 * Fields that can be updated on an exam
 */
export interface ExamUpdate {
    status?: ExamStatus;
    started_at?: string | null;
    submitted_at?: string | null;
    overall_score?: number | null;
    passed?: boolean | null;
    opik_trace_id?: string | null;
}

/**
 * Fields that can be updated on an exam answer
 */
export interface ExamAnswerUpdate {
    user_answer?: string;
    score?: number | null;
    feedback?: string | null;
    graded_at?: string | null;
    opik_span_id?: string | null;
}

// ============================================================================
// SUPABASE DATABASE TYPE DEFINITION
// ============================================================================

/**
 * Complete Supabase database type definition
 * Used for type-safe Supabase client operations
 */
export type Database = {
    public: {
        Tables: {
            users: {
                Row: User;
                Insert: UserInsert;
                Update: UserUpdate;
                Relationships: [];
            };
            commitments: {
                Row: Commitment;
                Insert: CommitmentInsert;
                Update: CommitmentUpdate;
                Relationships: [
                    {
                        foreignKeyName: 'commitments_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
            exams: {
                Row: Exam;
                Insert: ExamInsert;
                Update: ExamUpdate;
                Relationships: [
                    {
                        foreignKeyName: 'exams_commitment_id_fkey';
                        columns: ['commitment_id'];
                        isOneToOne: false;
                        referencedRelation: 'commitments';
                        referencedColumns: ['id'];
                    }
                ];
            };
            exam_answers: {
                Row: ExamAnswer;
                Insert: ExamAnswerInsert;
                Update: ExamAnswerUpdate;
                Relationships: [
                    {
                        foreignKeyName: 'exam_answers_exam_id_fkey';
                        columns: ['exam_id'];
                        isOneToOne: false;
                        referencedRelation: 'exams';
                        referencedColumns: ['id'];
                    }
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            commitment_status: CommitmentStatus;
            stake_status: StakeStatus;
            exam_status: ExamStatus;
            question_type: QuestionType;
            question_difficulty: QuestionDifficulty;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extract table names from the database
 */
export type TableName = keyof Database['public']['Tables'];

/**
 * Get the Row type for a specific table
 */
export type TableRow<T extends TableName> =
    Database['public']['Tables'][T]['Row'];

/**
 * Get the Insert type for a specific table
 */
export type TableInsert<T extends TableName> =
    Database['public']['Tables'][T]['Insert'];

/**
 * Get the Update type for a specific table
 */
export type TableUpdate<T extends TableName> =
    Database['public']['Tables'][T]['Update'];
