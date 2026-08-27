import { useAdminAccount } from '@/hooks/use-admin-account';
import { useScreenshotPreviewOptional } from '@/providers/screenshot-preview-provider';
import { useSubscription } from '@/providers/subscription-provider';

export function useEntitlement() {
  const { isPro, ready } = useSubscription();
  const { realIsAdminAccount, isAdminAccount } = useAdminAccount();
  const preview = useScreenshotPreviewOptional();
  const previewBlocksPro = preview?.mode === 'no-pro';
  const unlocked = previewBlocksPro ? false : isPro || realIsAdminAccount;

  return {
    ready,
    isPro: unlocked,
    isAdminAccount,
    /** @deprecated Use isAdminAccount */
    isAdminKey: isAdminAccount,
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
