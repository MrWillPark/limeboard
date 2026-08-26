import { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, View } from 'react-native';
import { Stack, router } from 'expo-router';
import type { PurchasesPackage } from 'react-native-purchases';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { isRevenueCatConfigured } from '@/lib/config/env';
import { useSubscription } from '@/providers/subscription-provider';

const PRO_FEATURES = [
  'Spend trend charts & top model breakdowns',
  'Full Explore filters and spend-by-model views',
  'Fleet keys tab with provisioned key analytics',
  'Extended timeframes and chart types',
];

export default function PaywallScreen() {
  const { isPro, offerings, purchase, restore, showManageSubscriptions, ready } =
    useSubscription();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packages = offerings?.current?.availablePackages ?? [];
  const annual = packages.find((p) => p.packageType === 'ANNUAL');
  const monthly = packages.find((p) => p.packageType === 'MONTHLY');
  const primary = annual ?? monthly ?? packages[0];

  const onPurchase = async (pkg: PurchasesPackage) => {
    setError(null);
    setBusy(true);
    try {
      await purchase(pkg);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setError(null);
    setBusy(true);
    try {
      await restore();
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
          title: 'LimeBoard Pro',
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
            Pro opens every chart and filter LimeBoard can render. A Management API key
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
              Subscriptions aren&apos;t configured in this build yet. Set RevenueCat env
              vars for production builds.
            </AppText>
          </Panel>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {primary ? (
              <AppButton
                title={`Continue · ${primary.product.priceString}${annual ? '/yr' : '/mo'}`}
                disabled={busy}
                onPress={() => void onPurchase(primary)}
              />
            ) : null}
            {monthly && annual ? (
              <AppButton
                title={`Monthly · ${monthly.product.priceString}/mo`}
                variant="ghost"
                disabled={busy}
                onPress={() => void onPurchase(monthly)}
              />
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
            automatically unless cancelled at least 24 hours before the period ends.
          </AppText>
          <AppText
            variant="caption"
            color={colors.limeSoft}
            onPress={() => void Linking.openURL('https://limeboard.app/terms')}
          >
            Terms of Use
          </AppText>
          <AppText
            variant="caption"
            color={colors.limeSoft}
            onPress={() => void Linking.openURL('https://limeboard.app/privacy')}
          >
            Privacy Policy
          </AppText>
        </View>
      </ScrollView>
    </>
  );
}
