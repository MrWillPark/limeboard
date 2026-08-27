import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { BalanceHero } from '@/components/cockpit/balance-hero';
import { BurnGauge } from '@/components/cockpit/burn-gauge';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { computeBurn, dailySpendSeries } from '@/lib/analytics/burn';
import { computeFleetPeriodSpend } from '@/lib/analytics/timeframe';
import { buildTodayTrendSeries } from '@/lib/analytics/today-trail';
import {
  useActivity,
  useCredits,
  useKeyInfo,
  useManagedKeys,
} from '@/hooks/use-openrouter';
import { useBurnRate } from '@/hooks/use-burn-rate';
import { useOpenRouter } from '@/providers/openrouter-provider';
import {
  syncDeskMonitorWidget,
  syncDeskMonitorWidgetDisconnected,
} from '@/lib/widgets/sync-desk-monitor-widget';

export default function DeskMonitorScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 720;
  const { ready, isConnected, meta, maskedKey } = useOpenRouter();

  const keyQuery = useKeyInfo();
  const creditsQuery = useCredits();
  const activityQuery = useActivity();
  const keysQuery = useManagedKeys();

  const activity = activityQuery.data ?? [];
  const burn = useMemo(
    () =>
      computeBurn(keyQuery.data, creditsQuery.data, activity, 'today', {
        fleetKeys: keysQuery.data,
        isManagementKey: meta?.isManagementKey,
      }),
    [keyQuery.data, creditsQuery.data, activity, keysQuery.data, meta?.isManagementKey]
  );

  const liveTodaySpend = useMemo(
    () =>
      computeFleetPeriodSpend(
        keyQuery.data,
        keysQuery.data,
        Boolean(meta?.isManagementKey),
        'today'
      ).spend,
    [keyQuery.data, keysQuery.data, meta?.isManagementKey]
  );

  const burnRate = useBurnRate({
    enabled: isConnected,
    isManagementKey: meta?.isManagementKey,
    liveSpend: liveTodaySpend,
  });

  const spendSeries = useMemo(() => {
    if (burn.periodSpend > 0) {
      return buildTodayTrendSeries(burn.periodSpend);
    }
    return dailySpendSeries(activity.filter((row) => {
      const d = row.date;
      const today = new Date().toISOString().slice(0, 10);
      return d === today;
    }));
  }, [burn.periodSpend, activity, keyQuery.dataUpdatedAt]);

  useEffect(() => {
    if (!ready) return;
    if (!isConnected) {
      syncDeskMonitorWidgetDisconnected();
      return;
    }
    syncDeskMonitorWidget(burnRate.snapshot);
  }, [ready, isConnected, burnRate.snapshot, keyQuery.dataUpdatedAt, activityQuery.dataUpdatedAt]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const prev = document.title;
    document.title = 'LimeBoard · Desk Monitor';
    return () => {
      document.title = prev;
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.limeSoft} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.xl,
        gap: spacing.xl,
        paddingBottom: spacing.xxl,
        maxWidth: 1100,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <View style={{ gap: 4, flex: 1 }}>
          <AppText variant="label" color={colors.limeSoft}>
            Desk Monitor
          </AppText>
          <AppText variant="title" style={{ fontSize: 28 }}>
            Live burn at a glance
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Pin this view on a second monitor or add the Desk Monitor widget to iPad / Mac desktop.
          </AppText>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <AppText color={colors.limeSoft}>Close</AppText>
        </Pressable>
      </View>

      {!isConnected ? (
        <Panel style={{ gap: spacing.md }}>
          <AppText>Connect an OpenRouter key to start monitoring burn from your desk.</AppText>
          <AppButton title="Connect OpenRouter" onPress={() => router.push('/connect')} />
        </Panel>
      ) : (
        <View
          style={{
            flexDirection: isWide ? 'row' : 'column',
            gap: spacing.lg,
            alignItems: 'stretch',
          }}
        >
          <View style={{ flex: isWide ? 1.1 : undefined, gap: spacing.lg }}>
            <BalanceHero
              burn={burn}
              series={spendSeries.map((p) => p.value)}
              timeframe="today"
              keyLabel={maskedKey}
              isManagementKey={meta?.isManagementKey}
            />
          </View>
          <View style={{ flex: isWide ? 0.9 : undefined }}>
            <BurnGauge
              snapshot={burnRate.snapshot}
              isLoading={burnRate.isLoading}
              isFetching={burnRate.isFetching}
              error={burnRate.error}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
