import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, View } from 'react-native';
import { Stack, router } from 'expo-router';
import type { PurchasesPackage } from 'react-native-purchases';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { LEGAL } from '@/lib/config/legal';
import { STORE_PRODUCTS } from '@/lib/config/products';
import { env, isRevenueCatConfigured } from '@/lib/config/env';
import { useSubscription } from '@/providers/subscription-provider';

const PRO_FEATURES = [
  'Spend trend charts & top model breakdowns',
  'Full Explore filters and spend-by-model views',
  'Fleet keys tab with provisioned key analytics',
  'Extended timeframes and chart types',
];

function packageLabel(pkg: PurchasesPackage): string {
  if (pkg.product.identifier === STORE_PRODUCTS.annual || pkg.packageType === 'ANNUAL') {
    return 'Burnline Pro — Annual';
  }
  if (pkg.product.identifier === STORE_PRODUCTS.monthly || pkg.packageType === 'MONTHLY') {
    return 'Burnline Pro — Monthly';
  }
  return pkg.product.title || 'Burnline Pro';
}

function packagePeriod(pkg: PurchasesPackage): string {
  if (pkg.product.identifier === STORE_PRODUCTS.annual || pkg.packageType === 'ANNUAL') {
    return '1 year';
  }
  if (pkg.product.identifier === STORE_PRODUCTS.monthly || pkg.packageType === 'MONTHLY') {
    return '1 month';
  }
  return pkg.product.subscriptionPeriod ?? 'subscription period';
}

export default function PaywallScreen() {
  const { isPro, offerings, purchase, restore, showManageSubscriptions, ready } =
    useSubscription();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packages = offerings?.current?.availablePackages ?? [];
  const annual =
    packages.find((p) => p.product.identifier === STORE_PRODUCTS.annual) ??
    packages.find((p) => p.packageType === 'ANNUAL');
  const monthly =
    packages.find((p) => p.product.identifier === STORE_PRODUCTS.monthly) ??
    packages.find((p) => p.packageType === 'MONTHLY');
  const primary = annual ?? monthly ?? packages[0];

  const onPurchase = async (pkg: PurchasesPackage) => {
    setError(null);
    setBusy(true);
    try {
      await purchase(pkg);
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Purchase failed';
      if (!/cancel/i.test(msg)) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setError(null);
    setBusy(true);
    try {
      const restored = await restore();
      Alert.alert(
        restored ? 'Purchases restored' : 'No active subscription',
        restored
          ? 'Your Burnline Pro subscription is active on this account.'
          : 'No active Burnline Pro subscription was found for this Apple ID.'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Burnline Pro',
          presentation: 'modal',
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 }}
      >
        <Panel accent style={{ gap: spacing.md }}>
          <AppText variant="label" color={colors.limeSoft}>
            Upgrade
          </AppText>
          <AppText variant="title">Unlock the full cockpit</AppText>
          <AppText>
            Pro opens every chart and filter Burnline can render. A Management API key
            still unlocks the deepest OpenRouter data.
          </AppText>
        </Panel>

        <Panel style={{ gap: spacing.sm }}>
          {PRO_FEATURES.map((line) => (
            <AppText key={line} variant="caption">
              • {line}
            </AppText>
          ))}
        </Panel>

        {isPro ? (
          <Panel style={{ gap: spacing.sm }}>
            <AppText variant="title" color={colors.limeSoft}>
              You&apos;re on Pro
            </AppText>
            {__DEV__ && env.devPro && !isRevenueCatConfigured() ? (
              <AppText variant="caption">
                Dev Pro override is on (EXPO_PUBLIC_DEV_PRO). Store purchases are inactive in
                this build.
              </AppText>
            ) : null}
            <AppButton
              title="Manage subscription"
              variant="ghost"
              onPress={() => void showManageSubscriptions()}
            />
          </Panel>
        ) : !ready ? (
          <ActivityIndicator color={colors.limeSoft} />
        ) : !isRevenueCatConfigured() ? (
          <Panel style={{ gap: spacing.sm }}>
            <AppText>
              {__DEV__
                ? 'Store billing is not configured in this build. Use a development/production build with RevenueCat keys, or set EXPO_PUBLIC_DEV_PRO=true to preview Pro UI.'
                : 'Subscriptions are temporarily unavailable. Please try again later or contact support.'}
            </AppText>
            <AppButton title="Close" variant="ghost" onPress={() => router.back()} />
          </Panel>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {primary ? (
              <Panel style={{ gap: spacing.xs }}>
                <AppText variant="label" color={colors.limeSoft}>
                  {packageLabel(primary)}
                </AppText>
                <AppText variant="title">
                  {primary.product.priceString}
                  {primary === annual ? ' / year' : ' / month'}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {packagePeriod(primary)} auto-renewing subscription
                </AppText>
                <AppButton
                  title={`Subscribe · ${primary.product.priceString}`}
                  disabled={busy}
                  onPress={() => void onPurchase(primary)}
                />
              </Panel>
            ) : (
              <AppText color={colors.amber}>
                No products available yet. Confirm App Store / RevenueCat offerings are linked.
              </AppText>
            )}
            {monthly && annual && primary === annual ? (
              <Panel style={{ gap: spacing.xs }}>
                <AppText variant="label" color={colors.textSecondary}>
                  {packageLabel(monthly)}
                </AppText>
                <AppText>
                  {monthly.product.priceString} / month · {packagePeriod(monthly)} auto-renewing
                </AppText>
                <AppButton
                  title={`Subscribe monthly · ${monthly.product.priceString}`}
                  variant="ghost"
                  disabled={busy}
                  onPress={() => void onPurchase(monthly)}
                />
              </Panel>
            ) : null}
            <AppButton
              title="Restore purchases"
              variant="ghost"
              disabled={busy}
              onPress={() => void onRestore()}
            />
          </View>
        )}

        {error ? (
          <AppText color={colors.red} selectable>
            {error}
          </AppText>
        ) : null}

        <View style={{ gap: spacing.xs }}>
          <AppText variant="caption" color={colors.textMuted}>
            Payment charged to your App Store or Play account. Subscriptions renew
            automatically unless cancelled at least 24 hours before the period ends. Account
            will be charged for renewal within 24 hours prior to the end of the current
            period.
          </AppText>
          <AppText
            variant="caption"
            color={colors.limeSoft}
            onPress={() => router.push('/terms')}
          >
            Terms of Use
          </AppText>
          <AppText
            variant="caption"
            color={colors.limeSoft}
            onPress={() => router.push('/privacy')}
          >
            Privacy Policy
          </AppText>
          <AppText
            variant="caption"
            color={colors.limeSoft}
            onPress={() => void Linking.openURL(LEGAL.eulaUrl)}
          >
            Apple Standard EULA
          </AppText>
        </View>
      </ScrollView>
    </>
  );
}
