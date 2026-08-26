import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { formatUsd, type BurnSnapshot, type FleetSnapshot } from '@/lib/analytics/burn';
import { timeframeLabel, type TimeframeId } from '@/lib/analytics/timeframe';

type SessionProps = {
  burn: BurnSnapshot;
  isManagementKey?: boolean;
};

export function SessionKeyPanel({ burn, isManagementKey }: SessionProps) {
  return (
    <Panel style={{ gap: spacing.md }}>
      <AppText variant="title">Connected key</AppText>
      <AppText variant="caption">
        Metrics below are for the key stored on this device — not whole-account
        totals.
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat label="Today" value={formatUsd(burn.sessionUsageDaily)} />
        <Stat label="7d" value={formatUsd(burn.sessionUsageWeekly)} />
        <Stat label="30d" value={formatUsd(burn.sessionUsageMonthly)} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat
          label="Key limit left"
          value={formatUsd(burn.sessionLimitRemaining)}
          hint={
            burn.sessionLimit != null
              ? `of ${formatUsd(burn.sessionLimit)} cap`
              : 'No per-key cap'
          }
        />
        <Stat label="Key type" value={isManagementKey ? 'Mgmt' : 'Standard'} />
      </View>
    </Panel>
  );
}

export function FleetSnapshotPanel({ fleet }: { fleet: FleetSnapshot }) {
  if (fleet.totalKeys === 0) return null;

  return (
    <Panel style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="title">Key fleet</AppText>
        <AppText variant="mono" selectable color={colors.limeSoft}>
          {fleet.activeKeys}/{fleet.totalKeys} active
        </AppText>
      </View>
      <AppText variant="caption">Highest daily burn among provisioned keys</AppText>
      <View style={{ gap: spacing.sm }}>
        {fleet.topKeys.map((key) => (
          <View
            key={key.name}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: spacing.md,
              paddingVertical: spacing.xs,
            }}
          >
            <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
              {key.name}
            </AppText>
            <AppText variant="mono" selectable style={{ fontSize: 13 }}>
              {formatUsd(key.usageDaily)}/d
            </AppText>
          </View>
        ))}
      </View>
    </Panel>
  );
}

export function TokenBreakdownPanel({
  burn,
  timeframe,
}: {
  burn: BurnSnapshot;
  timeframe: TimeframeId;
}) {
  return (
    <Panel style={{ gap: spacing.sm }}>
      <AppText variant="title">Token volume</AppText>
      <AppText variant="caption">
        {timeframeLabel(timeframe)} · from activity
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Stat label="Prompt" value={formatTokens(burn.periodPromptTokens)} />
        <Stat label="Completion" value={formatTokens(burn.periodCompletionTokens)} />
        <Stat label="Requests" value={String(burn.periodRequests)} />
      </View>
    </Panel>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="mono" selectable style={{ fontSize: 14 }}>
        {value}
      </AppText>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
    </View>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
