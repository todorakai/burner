/**
 * Burner Feature
 * Learning accountability app with loss aversion mechanics
 *
 * "Learn it or lose it"
 *
 * This feature provides:
 * - Learning commitment creation with stakes
 * - AI-generated exams for knowledge verification
 * - AI-graded answers with detailed feedback
 * - Dashboard with progress tracking and loss aversion mechanics
 * - Opik integration for LLM observability
 */

// Types
export * from './types';

// Validation utilities
export * from './utils';

// Components (uncomment as implemented)
// export * from './components';

// Hooks (uncomment as implemented)
// export * from './hooks';

// Services
export {
    supabase,
    createServiceClient,
    createServerClient,
} from './services';

export {
    calculateDeadline,
    getCommitmentsByUserId,
    getActiveCommitmentsByUserId,
    updateCommitmentStatus,
    updateCommitmentStakeStatus,
    updateCommitmentRetryUsed,
    commitmentService,
} from './services';

export type { CommitmentService } from './services';

// Actions
export {
    createCommitment,
    getActiveCommitments,
    getCommitmentById,
} from './actions';

export type { ValidationError, ActionResult } from './actions';
