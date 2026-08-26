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
import {
  FleetSnapshotPanel,
  SessionKeyPanel,
  TokenBreakdownPanel,
} from '@/components/cockpit/cockpit-modules';
import { ConnectKeyCard } from '@/components/cockpit/connect-key-card';
import { SpendTrendChart } from '@/components/cockpit/spend-trend-chart';
import { TopModelsPanel } from '@/components/cockpit/top-models-panel';
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
  type TimeframeId,
} from '@/lib/analytics/timeframe';
import { buildTodayTrendSeries, recordTodaySpendSample } from '@/lib/analytics/today-trail';
import {
  useActivity,
  useCredits,
  useKeyInfo,
  useManagedKeys,
} from '@/hooks/use-openrouter';
import { useAuth } from '@/providers/auth-provider';

export default function CockpitScreen() {
  const { ready, isConnected, meta, maskedKey } = useAuth();
  const [timeframe, setTimeframe] = useState<TimeframeId>('7d');

  const keyQuery = useKeyInfo();
  const creditsQuery = useCredits();
  const activityQuery = useActivity();
  const keysQuery = useManagedKeys();

  const activity = activityQuery.data ?? [];
  const windowActivity = useMemo(
    () => filterActivityByTimeframe(activity, timeframe),
    [activity, timeframe]
  );

  const burn = useMemo(
    () =>
      computeBurn(keyQuery.data, creditsQuery.data, activity, timeframe, {
        fleetKeys: keysQuery.data,
        isManagementKey: meta?.isManagementKey,
      }),
    [keyQuery.data, creditsQuery.data, activity, timeframe, keysQuery.data, meta?.isManagementKey]
  );

  useEffect(() => {
    if (timeframe !== 'today') return;
    recordTodaySpendSample(burn.periodSpend);
  }, [
    timeframe,
    burn.periodSpend,
    keyQuery.dataUpdatedAt,
    keysQuery.dataUpdatedAt,
  ]);

  const spendSeries = useMemo(() => {
    if (timeframe === 'today') {
      return buildTodayTrendSeries(burn.periodSpend);
    }
    return dailySpendSeries(windowActivity);
  }, [
    timeframe,
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
        <ConnectKeyCard />
      ) : (
        <>
          {(keyQuery.isError || creditsQuery.isError) && (
            <Panel style={{ gap: spacing.sm }}>
              <AppText color={colors.amber}>
                Couldn’t refresh OpenRouter data. Pull to retry.
              </AppText>
              <AppText variant="caption" selectable>
                {String(
                  (keyQuery.error as Error)?.message ??
                    (creditsQuery.error as Error)?.message ??
                    ''
                )}
              </AppText>
            </Panel>
          )}

          <TimeframePicker compact value={timeframe} onChange={setTimeframe} />

          <BalanceHero
            burn={burn}
            series={spendSeries.map((p) => p.value)}
            timeframe={timeframe}
            keyLabel={maskedKey}
            isManagementKey={meta?.isManagementKey}
          />

          {meta?.isManagementKey && !activityQuery.isError ? (
            <>
              <SpendTrendChart
                activity={windowActivity}
                timeframe={timeframe}
                total={burn.periodSpend}
                lineSeries={spendSeries}
                dataSource={burn.periodDataSource}
                isManagementKey={meta?.isManagementKey}
              />
              <TokenBreakdownPanel burn={burn} timeframe={timeframe} />
              <TopModelsPanel rows={topModels} timeframe={timeframe} />
              <FleetSnapshotPanel fleet={fleet} />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <NavChip label="Full Explore →" onPress={() => router.push('/(tabs)/analytics')} />
                <NavChip label="All keys →" onPress={() => router.push('/(tabs)/keys')} />
              </View>
            </>
          ) : !meta?.isManagementKey ? (
            <Panel style={{ gap: spacing.sm }}>
              <AppText variant="title">Unlock account-wide charts</AppText>
              <AppText>
                Charts and model breakdown need a Management API key. Session key
                stats below still reflect /key for this device.
              </AppText>
              <Link href="/connect" asChild>
                <Pressable>
                  <AppText color={colors.limeSoft}>Replace key →</AppText>
                </Pressable>
              </Link>
            </Panel>
          ) : (
            <Panel>
              <AppText color={colors.amber}>
                Activity unavailable — balance from /credits still shown above.
              </AppText>
            </Panel>
          )}

          <SessionKeyPanel burn={burn} isManagementKey={meta?.isManagementKey} />
        </>
      )}
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
