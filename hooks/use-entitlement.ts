import { useOpenRouter } from '@/providers/openrouter-provider';
import { useSubscription } from '@/providers/subscription-provider';

export function useEntitlement() {
  const { isPro, ready } = useSubscription();
  const { isAdminKey } = useOpenRouter();
  const unlocked = isPro || isAdminKey;

  return {
    ready,
    isPro: unlocked,
    isAdminKey,
    canAccessSpendTrend: unlocked,
    canAccessTopModels: unlocked,
    canAccessTokenBreakdown: unlocked,
    canAccessFleetSnapshot: unlocked,
    canAccessExploreFull: unlocked,
    canAccessKeysFleet: unlocked,
    canGroupByModel: unlocked,
    canUseExploreFilters: unlocked,
    canUseIntradayRollups: unlocked,
  };
}
