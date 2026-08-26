import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { Link } from 'expo-router';

import { BalanceHero } from '@/components/cockpit/balance-hero';
import { ConnectKeyCard } from '@/components/cockpit/connect-key-card';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import {
  computeBurn,
  dailySpendSeries,
  formatUsd,
} from '@/lib/analytics/burn';
import {
  useActivity,
  useCredits,
  useKeyInfo,
} from '@/hooks/use-openrouter';
import { useAuth } from '@/providers/auth-provider';

export default function CockpitScreen() {
  const { ready, isConnected, meta, maskedKey } = useAuth();
  const keyQuery = useKeyInfo();
  const creditsQuery = useCredits();
  const activityQuery = useActivity();

  const refreshing =
    keyQuery.isFetching || creditsQuery.isFetching || activityQuery.isFetching;

  const onRefresh = () => {
    keyQuery.refetch();
    creditsQuery.refetch();
    if (meta?.isManagementKey) activityQuery.refetch();
  };

  const burn = useMemo(
    () =>
      computeBurn(
        keyQuery.data,
        creditsQuery.data,
        activityQuery.data ?? []
      ),
    [keyQuery.data, creditsQuery.data, activityQuery.data]
  );

  const series = useMemo(
    () => dailySpendSeries(activityQuery.data ?? []).map((d) => d.value),
    [activityQuery.data]
  );

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 }}
      refreshControl={
        isConnected ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lime}
          />
        ) : undefined
      }
    >
      <View style={{ gap: 6 }}>
        <AppText variant="display">LimeBoard</AppText>
        <AppText>
          OpenRouter burn radar — credits, velocity, and runway in one cockpit.
        </AppText>
      </View>

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

          <BalanceHero
            burn={burn}
            series={series}
            keyLabel={maskedKey}
            isManagementKey={meta?.isManagementKey}
          />

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <InsightChip
              title="Avg daily"
              value={formatUsd(burn.avgDailyFromActivity)}
            />
            <InsightChip
              title="Limit left"
              value={formatUsd(keyQuery.data?.limit_remaining ?? null)}
            />
          </View>

          {!meta?.isManagementKey ? (
            <Panel style={{ gap: spacing.sm }}>
              <AppText variant="title">Unlock full telemetry</AppText>
              <AppText>
                You’re on a standard API key. Swap in a Management API key to
                pull 30-day model activity and the keys fleet.
              </AppText>
              <Link href="/connect" asChild>
                <Pressable>
                  <AppText color={colors.lime}>Replace key →</AppText>
                </Pressable>
              </Link>
            </Panel>
          ) : activityQuery.isError ? (
            <Panel>
              <AppText color={colors.amber}>
                Activity endpoint unavailable for this key. Balance metrics still
                work from /key and /credits.
              </AppText>
            </Panel>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function InsightChip({ title, value }: { title: string; value: string }) {
  return (
    <Panel style={{ flex: 1, gap: 4 }}>
      <AppText variant="label">{title}</AppText>
      <AppText variant="mono" selectable style={{ fontSize: 18, color: colors.limeSoft }}>
        {value}
      </AppText>
    </Panel>
  );
}
