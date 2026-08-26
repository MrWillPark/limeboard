import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import { Donut } from '@/components/charts/charts';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import {
  aggregateByModel,
  formatTokens,
  formatUsd,
} from '@/lib/analytics/burn';
import { useActivity } from '@/hooks/use-openrouter';
import { useAuth } from '@/providers/auth-provider';

export default function AnalyticsScreen() {
  const { isConnected, meta } = useAuth();
  const activityQuery = useActivity();

  const rows = useMemo(
    () => aggregateByModel(activityQuery.data ?? []),
    [activityQuery.data]
  );

  const slices = useMemo(
    () =>
      rows.slice(0, 6).map((row, i) => ({
        value: row.usage,
        color: colors.chart[i % colors.chart.length],
      })),
    [rows]
  );

  const totalSpend = rows.reduce((s, r) => s + r.usage, 0);
  const totalPrompt = rows.reduce((s, r) => s + r.promptTokens, 0);
  const totalCompletion = rows.reduce((s, r) => s + r.completionTokens, 0);

  if (!isConnected) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.lg }}
      >
        <Panel>
          <AppText>Connect an OpenRouter key on the Cockpit tab to see model spend.</AppText>
        </Panel>
      </ScrollView>
    );
  }

  if (!meta?.isManagementKey) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.lg }}
      >
        <Panel style={{ gap: spacing.sm }}>
          <AppText variant="title">Management key required</AppText>
          <AppText>
            Model breakdown uses GET /api/v1/activity, which needs a Management
            API key from OpenRouter.
          </AppText>
        </Panel>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={activityQuery.isFetching}
          onRefresh={() => activityQuery.refetch()}
          tintColor={colors.lime}
        />
      }
    >
      <AppText>
        Last ~30 days of OpenRouter spend by model — input vs output tokens and
        cost share.
      </AppText>

      {activityQuery.isLoading ? (
        <ActivityIndicator color={colors.lime} />
      ) : activityQuery.isError ? (
        <Panel>
          <AppText color={colors.red} selectable>
            {(activityQuery.error as Error).message}
          </AppText>
        </Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <AppText>No activity in the last 30 days.</AppText>
        </Panel>
      ) : (
        <>
          <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl }}>
            <Donut slices={slices} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Stat label="Total spend" value={formatUsd(totalSpend)} />
              <Stat label="Prompt tokens" value={formatTokens(totalPrompt)} />
              <Stat label="Completion" value={formatTokens(totalCompletion)} />
            </View>
          </Panel>

          <View style={{ gap: spacing.sm }}>
            {rows.map((row, index) => (
              <Panel key={row.model} style={{ gap: spacing.sm }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: spacing.md,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="title" selectable numberOfLines={1}>
                      {row.model}
                    </AppText>
                    <AppText variant="caption">{row.provider}</AppText>
                  </View>
                  <AppText variant="mono" color={colors.lime} selectable>
                    {formatUsd(row.usage)}
                  </AppText>
                </View>

                <View
                  style={{
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: colors.border,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${Math.max(row.share * 100, 2)}%`,
                      height: '100%',
                      backgroundColor: colors.chart[index % colors.chart.length],
                    }}
                  />
                </View>

                <AppText variant="caption">
                  {(row.share * 100).toFixed(1)}% · {formatTokens(row.promptTokens)} in /{' '}
                  {formatTokens(row.completionTokens)} out · {row.requests} req
                </AppText>
              </Panel>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="mono" selectable>
        {value}
      </AppText>
    </View>
  );
}
