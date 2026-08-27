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

import { env, isRevenueCatConfigured } from '@/lib/config/env';
import { PRO_ENTITLEMENT } from '@/lib/config/products';
import { useSession } from '@/providers/session-provider';

const ENTITLEMENT = PRO_ENTITLEMENT;

type SubscriptionState = {
  ready: boolean;
  isPro: boolean;
  offerings: PurchasesOfferings | null;
  customerInfo: CustomerInfo | null;
  purchase: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
  showManageSubscriptions: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionState | null>(null);

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const { user, session } = useSession();
  const [ready, setReady] = useState(!isRevenueCatConfigured());
  const [isPro, setIsPro] = useState(env.devPro);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const applyCustomerInfo = useCallback((info: CustomerInfo | null) => {
    setCustomerInfo(info);
    const active = info?.entitlements.active[ENTITLEMENT]?.isActive === true;
    setIsPro(active || env.devPro);
  }, []);

  useEffect(() => {
    if (!isRevenueCatConfigured()) {
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

    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.INFO : LOG_LEVEL.WARN);

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
        console.warn('RevenueCat init failed', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, applyCustomerInfo]);

  useEffect(() => {
    if (!isRevenueCatConfigured() || !user?.id || !session) return;

    (async () => {
      try {
        const { customerInfo: info } = await Purchases.logIn(user.id);
        applyCustomerInfo(info);
        setOfferings(await Purchases.getOfferings());
      } catch (e) {
        console.warn('RevenueCat logIn failed', e);
      }
    })();
  }, [user?.id, session, applyCustomerInfo]);

  useEffect(() => {
    if (!isRevenueCatConfigured()) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void Purchases.getCustomerInfo()
        .then(applyCustomerInfo)
        .catch(() => {});
    });

    return () => sub.remove();
  }, [applyCustomerInfo]);

  const refresh = useCallback(async () => {
    if (!isRevenueCatConfigured()) return;
    const info = await Purchases.getCustomerInfo();
    applyCustomerInfo(info);
    setOfferings(await Purchases.getOfferings());
  }, [applyCustomerInfo]);

  const purchase = useCallback(
    async (pkg: PurchasesPackage) => {
      if (!isRevenueCatConfigured()) {
        throw new Error('Subscriptions are not configured yet');
      }
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      applyCustomerInfo(info);
    },
    [applyCustomerInfo]
  );

  const restore = useCallback(async () => {
    if (!isRevenueCatConfigured()) {
      throw new Error('Subscriptions are not configured yet');
    }
    const info = await Purchases.restorePurchases();
    applyCustomerInfo(info);
  }, [applyCustomerInfo]);

  const showManageSubscriptions = useCallback(async () => {
    if (!isRevenueCatConfigured()) return;
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
  return ctx;
}

export { useEntitlement } from '@/hooks/use-entitlement';
