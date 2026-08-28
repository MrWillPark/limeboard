import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';

import { isAdminAccountEmail } from '@/lib/auth/admin-account';
import { env, canUseRevenueCatNative } from '@/lib/config/env';
import { PRO_ENTITLEMENT } from '@/lib/config/products';
import { useScreenshotPreviewOptional } from '@/providers/screenshot-preview-provider';
import { useSession } from '@/providers/session-provider';

const ENTITLEMENT = PRO_ENTITLEMENT;

type SubscriptionState = {
  ready: boolean;
  isPro: boolean;
  offerings: PurchasesOfferings | null;
  customerInfo: CustomerInfo | null;
  purchase: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
  showManageSubscriptions: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionState | null>(null);

function isRevenueCatNoise(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('OfferingsManager.Error') ||
    message.includes('products registered') ||
    message.includes('CONFIGURATION_ERROR') ||
    message.includes('could not be fetched from App Store')
  );
}

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const { user, session } = useSession();
  const [ready, setReady] = useState(!canUseRevenueCatNative());
  const [isPro, setIsPro] = useState(env.devPro);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const adminAccount = isAdminAccountEmail(user?.email);

  const applyCustomerInfo = useCallback(
    (info: CustomerInfo | null) => {
      setCustomerInfo(info);
      const active = info?.entitlements.active[ENTITLEMENT]?.isActive === true;
      setIsPro(active || env.devPro || adminAccount);
    },
    [adminAccount]
  );

  useEffect(() => {
    if (adminAccount) {
      setIsPro(true);
      setReady(true);
      return;
    }

    if (!canUseRevenueCatNative()) {
      setReady(true);
      setIsPro(env.devPro);
      return;
    }

    const apiKey =
      Platform.OS === 'ios'
        ? env.revenueCatIosKey
        : Platform.OS === 'android'
          ? env.revenueCatAndroidKey
          : env.revenueCatIosKey;

    if (!apiKey) {
      setReady(true);
      return;
    }

    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);

    let cancelled = false;

    (async () => {
      try {
        if (user?.id) {
          await Purchases.configure({ apiKey, appUserID: user.id });
        } else {
          await Purchases.configure({ apiKey });
        }

        const [info, currentOfferings] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);

        if (cancelled) return;
        applyCustomerInfo(info);
        setOfferings(currentOfferings);
      } catch (e) {
        if (!isRevenueCatNoise(e) && __DEV__) {
          console.warn('RevenueCat init failed', e);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, applyCustomerInfo, adminAccount]);

  useEffect(() => {
    if (adminAccount || !canUseRevenueCatNative() || !user?.id || !session) return;

    (async () => {
      try {
        const { customerInfo: info } = await Purchases.logIn(user.id);
        applyCustomerInfo(info);
        setOfferings(await Purchases.getOfferings());
      } catch (e) {
        if (!isRevenueCatNoise(e) && __DEV__) {
          console.warn('RevenueCat logIn failed', e);
        }
      }
    })();
  }, [user?.id, session, applyCustomerInfo, adminAccount]);

  useEffect(() => {
    if (!canUseRevenueCatNative() || adminAccount) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void Purchases.getCustomerInfo()
        .then(applyCustomerInfo)
        .catch(() => {});
    });

    return () => sub.remove();
  }, [applyCustomerInfo, adminAccount]);

  const refresh = useCallback(async () => {
    if (adminAccount) return;
    if (!canUseRevenueCatNative()) return;
    const info = await Purchases.getCustomerInfo();
    applyCustomerInfo(info);
    setOfferings(await Purchases.getOfferings());
  }, [applyCustomerInfo, adminAccount]);

  const purchase = useCallback(
    async (pkg: PurchasesPackage) => {
      if (!canUseRevenueCatNative()) {
        throw new Error('Subscriptions are not configured yet');
      }
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      applyCustomerInfo(info);
    },
    [applyCustomerInfo]
  );

  const restore = useCallback(async () => {
    if (!canUseRevenueCatNative()) {
      throw new Error('Subscriptions are not configured yet');
    }
    const info = await Purchases.restorePurchases();
    applyCustomerInfo(info);
    return info?.entitlements.active[ENTITLEMENT]?.isActive === true;
  }, [applyCustomerInfo]);

  const showManageSubscriptions = useCallback(async () => {
    if (!canUseRevenueCatNative()) return;
    await Purchases.showManageSubscriptions();
  }, []);

  const value = useMemo<SubscriptionState>(
    () => ({
      ready,
      isPro,
      offerings,
      customerInfo,
      purchase,
      restore,
      refresh,
      showManageSubscriptions,
    }),
    [ready, isPro, offerings, customerInfo, purchase, restore, refresh, showManageSubscriptions]
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');

  const preview = useScreenshotPreviewOptional();
  if (preview?.mode !== 'no-pro') return ctx;

  return { ...ctx, isPro: false };
}
