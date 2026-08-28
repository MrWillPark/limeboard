import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';

import { BalanceHero } from '@/components/cockpit/balance-hero';
import { BurnGauge } from '@/components/cockpit/burn-gauge';
import {
  FleetSnapshotPanel,
  SessionKeyPanel,
  TokenBreakdownPanel,
} from '@/components/cockpit/cockpit-modules';
import { PlatformPulse } from '@/components/cockpit/platform-pulse';
import { AppButton } from '@/components/ui/app-button';
import { SpendTrendChart } from '@/components/cockpit/spend-trend-chart';
import { TopModelsPanel } from '@/components/cockpit/top-models-panel';
import {
  ManagementKeyHint,
  UpgradePanel,
} from '@/components/subscription/upgrade-panel';
import { TimeframePicker } from '@/components/shared/timeframe-picker';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import {
  aggregateByModel,
  computeBurn,
  computeFleetSnapshot,
  dailySpendSeries,
} from '@/lib/analytics/burn';
import {
  filterActivityByTimeframe,
  computeFleetPeriodSpend,
  type TimeframeId,
} from '@/lib/analytics/timeframe';
import { buildTodayTrendSeries, recordTodaySpendSample } from '@/lib/analytics/today-trail';
import {
  useActivity,
  useCredits,
  useKeyInfo,
  useManagedKeys,
} from '@/hooks/use-openrouter';
import { useBurnRate } from '@/hooks/use-burn-rate';
import { useEntitlement } from '@/hooks/use-entitlement';
import { useOpenRouter } from '@/providers/openrouter-provider';
import { useSession } from '@/providers/session-provider';
import {
  syncBalanceWidget,
  syncBalanceWidgetDisconnected,
} from '@/lib/widgets/sync-balance-widget';
import {
  syncDeskMonitorWidget,
  syncDeskMonitorWidgetDisconnected,
} from '@/lib/widgets/sync-desk-monitor-widget';

const FREE_TIMEFRAMES: TimeframeId[] = ['today', '7d'];

export default function CockpitScreen() {
  const { user } = useSession();
  const { ready, isConnected, meta, maskedKey, keyRejectedMessage, clearKeyRejectedMessage } =
    useOpenRouter();
  const {
    isPro,
    canAccessSpendTrend,
    canAccessTopModels,
    canAccessTokenBreakdown,
    canAccessFleetSnapshot,
  } = useEntitlement();
  const [timeframe, setTimeframe] = useState<TimeframeId>('7d');

  const effectiveTimeframe =
    isPro || FREE_TIMEFRAMES.includes(timeframe) ? timeframe : '7d';

  const keyQuery = useKeyInfo();
  const creditsQuery = useCredits();
  const activityQuery = useActivity();
  const keysQuery = useManagedKeys();

  const activity = activityQuery.data ?? [];
  const windowActivity = useMemo(
    () => filterActivityByTimeframe(activity, effectiveTimeframe),
    [activity, effectiveTimeframe]
  );

  const burn = useMemo(
    () =>
      computeBurn(keyQuery.data, creditsQuery.data, activity, effectiveTimeframe, {
        fleetKeys: keysQuery.data,
        isManagementKey: meta?.isManagementKey,
      }),
    [
      keyQuery.data,
      creditsQuery.data,
      activity,
      effectiveTimeframe,
      keysQuery.data,
      meta?.isManagementKey,
    ]
  );

  useEffect(() => {
    if (effectiveTimeframe !== 'today') return;
    recordTodaySpendSample(burn.periodSpend);
  }, [
    effectiveTimeframe,
    burn.periodSpend,
    keyQuery.dataUpdatedAt,
    keysQuery.dataUpdatedAt,
  ]);

  useEffect(() => {
    if (!ready) return;
    if (!isConnected) {
      syncBalanceWidgetDisconnected();
      syncDeskMonitorWidgetDisconnected();
      return;
    }
    syncBalanceWidget(burn, effectiveTimeframe);
  }, [
    ready,
    isConnected,
    burn,
    effectiveTimeframe,
    keyQuery.dataUpdatedAt,
    creditsQuery.dataUpdatedAt,
  ]);

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

  useEffect(() => {
    if (!ready || !isConnected) return;
    syncDeskMonitorWidget(burnRate.snapshot);
  }, [
    ready,
    isConnected,
    burnRate.snapshot,
    keyQuery.dataUpdatedAt,
    activityQuery.dataUpdatedAt,
  ]);

  const spendSeries = useMemo(() => {
    if (effectiveTimeframe === 'today') {
      return buildTodayTrendSeries(burn.periodSpend);
    }
    return dailySpendSeries(windowActivity);
  }, [
    effectiveTimeframe,
    burn.periodSpend,
    windowActivity,
    keyQuery.dataUpdatedAt,
    keysQuery.dataUpdatedAt,
  ]);

  const topModels = useMemo(
    () => aggregateByModel(windowActivity),
    [windowActivity]
  );

  const fleet = useMemo(
    () => computeFleetSnapshot(keysQuery.data),
    [keysQuery.data]
  );

  const refreshing =
    keyQuery.isFetching ||
    creditsQuery.isFetching ||
    activityQuery.isFetching ||
    keysQuery.isFetching;

  const onRefresh = () => {
    keyQuery.refetch();
    creditsQuery.refetch();
    burnRate.refetch();
    if (meta?.isManagementKey) {
      activityQuery.refetch();
      keysQuery.refetch();
    }
  };

  if (!ready) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}
      >
        <ActivityIndicator color={colors.limeSoft} />
      </View>
    );
  }

  const displayName =
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    'there';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.lg,
        paddingBottom: 48,
      }}
      refreshControl={
        isConnected ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.limeSoft}
          />
        ) : undefined
      }
    >
      {!isConnected ? (
        <>
          {keyRejectedMessage ? (
            <Panel style={{ gap: spacing.sm }}>
              <AppText color={colors.amber}>{keyRejectedMessage}</AppText>
              <AppButton
                title="Connect OpenRouter"
                onPress={() => {
                  clearKeyRejectedMessage();
                  router.push('/connect');
                }}
              />
            </Panel>
          ) : null}
          <PlatformPulse />
          <Panel style={{ gap: spacing.sm }}>
            <AppText variant="label" color={colors.limeSoft}>
              Your cockpit
            </AppText>
            <AppText variant="title">Hi {displayName}</AppText>
            <AppText>
              Connect an OpenRouter key to unlock personal balance, burn rate, and runway —
              the same instrumentation you just saw for the whole ecosystem.
            </AppText>
            <AppButton title="Connect OpenRouter" onPress={() => router.push('/connect')} />
          </Panel>
        </>
      ) : (
        <>
          {(keyQuery.isError || creditsQuery.isError) && (
            <Panel style={{ gap: spacing.sm }}>
              <AppText color={colors.amber}>
                Couldn&apos;t refresh OpenRouter data. Pull to retry.
              </AppText>
              <AppText variant="caption" selectable>
                {String(
                  (keyQuery.error as Error)?.message ??
                    (creditsQuery.error as Error)?.message ??
                    ''
                )}
              </AppText>
              {keyQuery.isError ? (
                <AppButton
                  title="Reconnect key"
                  variant="ghost"
                  onPress={() => router.push('/connect')}
                />
              ) : null}
            </Panel>
          )}

          <TimeframePicker
            compact
            value={effectiveTimeframe}
            onChange={setTimeframe}
            allowed={isPro ? undefined : FREE_TIMEFRAMES}
          />

          <BalanceHero
            burn={burn}
            series={spendSeries.map((p) => p.value)}
            timeframe={effectiveTimeframe}
            keyLabel={maskedKey}
            isManagementKey={meta?.isManagementKey}
          />

          <BurnGauge
            snapshot={burnRate.snapshot}
            isLoading={burnRate.isLoading}
            isFetching={burnRate.isFetching}
            error={burnRate.error}
          />

          {!meta?.isManagementKey ? (
            <ManagementKeyHint feature="Spend trends and model breakdowns." />
          ) : null}

          {canAccessSpendTrend && meta?.isManagementKey && !activityQuery.isError ? (
            <SpendTrendChart
              activity={windowActivity}
              timeframe={effectiveTimeframe}
              total={burn.periodSpend}
              lineSeries={spendSeries}
              dataSource={burn.periodDataSource}
              isManagementKey={meta?.isManagementKey}
            />
          ) : !canAccessSpendTrend ? (
            <UpgradePanel
              title="Spend trend"
              description="See daily spend over time and spot burn spikes before they drain credits."
            />
          ) : meta?.isManagementKey && activityQuery.isError ? (
            <Panel>
              <AppText color={colors.amber}>
                Activity unavailable — balance from /credits still shown above.
              </AppText>
            </Panel>
          ) : null}

          {canAccessTokenBreakdown && meta?.isManagementKey ? (
            <TokenBreakdownPanel burn={burn} timeframe={effectiveTimeframe} />
          ) : null}

          {canAccessTopModels && meta?.isManagementKey ? (
            <TopModelsPanel rows={topModels} timeframe={effectiveTimeframe} />
          ) : !canAccessTopModels && meta?.isManagementKey ? (
            <UpgradePanel
              title="Top models"
              description="See which models drive spend and where to optimize routing."
            />
          ) : null}

          {canAccessFleetSnapshot && meta?.isManagementKey ? (
            <FleetSnapshotPanel fleet={fleet} />
          ) : null}

          {(isPro || meta?.isManagementKey) && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {isPro ? (
                <NavChip
                  label="Full Explore →"
                  onPress={() => router.push('/(tabs)/analytics')}
                />
              ) : null}
              {canAccessFleetSnapshot && meta?.isManagementKey ? (
                <NavChip label="All keys →" onPress={() => router.push('/(tabs)/keys')} />
              ) : null}
            </View>
          )}

          <SessionKeyPanel burn={burn} isManagementKey={meta?.isManagementKey} />
        </>
      )}

      {!isConnected ? null : <PlatformPulse compact />}
    </ScrollView>
  );
}

function NavChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.borderStrong,
        backgroundColor: colors.panel,
        alignItems: 'center',
      }}
    >
      <AppText color={colors.limeSoft}>{label}</AppText>
    </Pressable>
  );
}
