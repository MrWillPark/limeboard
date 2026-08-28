import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import { PlatformPulse } from '@/components/cockpit/platform-pulse';
import { UpgradePanel } from '@/components/subscription/upgrade-panel';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { formatUsd } from '@/lib/analytics/burn';
import { useKeyInfo, useManagedKeys } from '@/hooks/use-openrouter';
import { useOpenRouter } from '@/providers/openrouter-provider';
import { useEntitlement } from '@/hooks/use-entitlement';

export default function KeysScreen() {
  const { isConnected, meta, maskedKey } = useOpenRouter();
  const { canAccessKeysFleet } = useEntitlement();
  const keyQuery = useKeyInfo();
  const keysQuery = useManagedKeys();

  const fleetTotals = useMemo(() => {
    const keys = keysQuery.data ?? [];
    return {
      daily: keys.reduce((s, k) => s + k.usage_daily, 0),
      weekly: keys.reduce((s, k) => s + k.usage_weekly, 0),
      monthly: keys.reduce((s, k) => s + k.usage_monthly, 0),
      count: keys.length,
    };
  }, [keysQuery.data]);

  if (!isConnected) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      >
        <Panel>
          <AppText>Connect a key to inspect your session and fleet.</AppText>
        </Panel>
        <PlatformPulse />
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
          refreshing={keyQuery.isFetching || keysQuery.isFetching}
          onRefresh={() => {
            keyQuery.refetch();
            if (meta?.isManagementKey) keysQuery.refetch();
          }}
          tintColor={colors.limeSoft}
        />
      }
    >
      <Panel style={{ gap: spacing.sm }} accent>
        <AppText variant="label" color={colors.limeSoft}>
          Connected session
        </AppText>
        <AppText variant="title" selectable>
          {meta?.isManagementKey ? 'Management key' : 'API key'}
        </AppText>
        <AppText variant="mono" selectable>
          {maskedKey}
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
          <KeyMetric label="Today" value={formatUsd(keyQuery.data?.usage_daily)} />
          <KeyMetric label="Week" value={formatUsd(keyQuery.data?.usage_weekly)} />
          <KeyMetric label="Month" value={formatUsd(keyQuery.data?.usage_monthly)} />
        </View>
      </Panel>

      {!meta?.isManagementKey ? (
        <Panel style={{ gap: spacing.sm }}>
          <AppText variant="title">Fleet list needs a management key</AppText>
          <AppText>
            Listing every provisioned key requires a Management API key (GET
            /api/v1/keys). Pro unlocks the fleet UI once connected.
          </AppText>
        </Panel>
      ) : !canAccessKeysFleet ? (
        <UpgradePanel
          title="Fleet analytics"
          description="See every provisioned key with rolling spend counters and fleet totals."
        />
      ) : keysQuery.isLoading ? (
        <ActivityIndicator color={colors.limeSoft} />
      ) : keysQuery.isError ? (
        <Panel>
          <AppText color={colors.red} selectable>
            {(keysQuery.error as Error).message}
          </AppText>
        </Panel>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Panel style={{ gap: spacing.sm }}>
            <AppText variant="label">
              Fleet totals · {fleetTotals.count} keys
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <KeyMetric label="Today" value={formatUsd(fleetTotals.daily)} />
              <KeyMetric label="Week" value={formatUsd(fleetTotals.weekly)} />
              <KeyMetric label="Month" value={formatUsd(fleetTotals.monthly)} />
            </View>
            <AppText variant="caption">
              Rolling OpenRouter counters — Explore Today / 7d / 30d Overview spend uses
              these sums (tokens/requests come from Activity).
            </AppText>
          </Panel>

          <AppText variant="label">Provisioned keys · {fleetTotals.count}</AppText>
          {(keysQuery.data ?? []).map((key) => (
            <Panel key={key.hash} style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: spacing.md,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="title" numberOfLines={1} selectable>
                    {key.name || key.label}
                  </AppText>
                  <AppText variant="caption" selectable>
                    {key.label}
                  </AppText>
                </View>
                <StatusPill disabled={key.disabled} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                <KeyMetric label="Today" value={formatUsd(key.usage_daily)} />
                <KeyMetric label="Week" value={formatUsd(key.usage_weekly)} />
                <KeyMetric label="Month" value={formatUsd(key.usage_monthly)} />
              </View>
            </Panel>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function KeyMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2, flex: 1 }}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="mono" selectable>
        {value}
      </AppText>
    </View>
  );
}

function StatusPill({ disabled }: { disabled: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: disabled ? colors.redDim : colors.limeDim,
      }}
    >
      <AppText
        style={{ fontSize: 12, color: disabled ? colors.red : colors.limeSoft }}
      >
        {disabled ? 'Disabled' : 'Active'}
      </AppText>
    </View>
  );
}
