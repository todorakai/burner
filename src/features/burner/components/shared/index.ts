/**
 * Shared Components for Burner Feature
 * Re-exports all shared components used across the Burner feature
 */

// User sync provider
export {
    UserSyncProvider,
    useUserSyncContext,
    UserSyncGate,
    type UserSyncProviderProps,
    type UserSyncGateProps,
} from './user-sync-provider';

// Stake visualization components
export { StakeBadge, type StakeBadgeProps } from './stake-badge';
export { StakeVisualization, type StakeVisualizationProps } from './stake-visualization';

// Urgency indicator components
export {
    UrgencyIndicator,
    type UrgencyIndicatorProps,
    type UrgencyLevel,
    useUrgencyLevel,
    isDeadlineUrgent,
    isDeadlineCritical,
} from './urgency-indicator';

// Stake notification components
export {
    showStakeNotification,
    showStakeSavedNotification,
    showStakeBurnedNotification,
    showStakeAtRiskNotification,
    useStakeNotification,
    type StakeNotificationConfig,
    type UseStakeNotificationOptions,
} from './stake-notification';
