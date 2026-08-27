import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { DeskSpeedometer } from '@/components/desk/desk-speedometer';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';
import { computeBurn, formatShortDate, formatUsd } from '@/lib/analytics/burn';
import { computeFleetPeriodSpend } from '@/lib/analytics/timeframe';
import {
  useActivity,
  useCredits,
  useKeyInfo,
  useManagedKeys,
} from '@/hooks/use-openrouter';
import { BURN_RATE_POLL_MS, useBurnRate } from '@/hooks/use-burn-rate';
import { useDeskLandscapeLock } from '@/hooks/use-desk-landscape-lock';
import { useOpenRouter } from '@/providers/openrouter-provider';
import {
  syncDeskMonitorWidget,
  syncDeskMonitorWidgetDisconnected,
} from '@/lib/widgets/sync-desk-monitor-widget';

const POLL_INTERVAL_SEC = BURN_RATE_POLL_MS / 1000;

export default function DeskMonitorScreen() {
  useDeskLandscapeLock();

  const { width, height } = useWindowDimensions();
  const isLandscape = width >= height;
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

  const gaugeSize = Math.min(width * 0.52, height * 0.88, 520);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.limeSoft} />
      </View>
    );
  }

  if (!isLandscape) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <AppText variant="title" style={{ textAlign: 'center' }}>
          Rotate to landscape
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          Desk Monitor is locked to landscape for your second screen.
        </AppText>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <AppText color={colors.limeSoft}>Close</AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={['rgba(57,255,20,0.06)', 'transparent', 'rgba(57,255,20,0.03)']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.lg,
          gap: spacing.xl,
        }}
      >
        <View style={{ flex: 1.25, justifyContent: 'center' }}>
          {!isConnected ? (
            <View style={{ gap: spacing.md, maxWidth: 420 }}>
              <AppText variant="title">Connect to monitor burn</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Link your OpenRouter key to see live velocity on this screen.
              </AppText>
              <AppButton title="Connect OpenRouter" onPress={() => router.push('/connect')} />
            </View>
          ) : (
            <DeskSpeedometer
              snapshot={burnRate.snapshot}
              size={gaugeSize}
              isLoading={burnRate.isLoading}
              isFetching={burnRate.isFetching}
              error={burnRate.error}
              pollIntervalSec={POLL_INTERVAL_SEC}
            />
          )}
        </View>

        <View
          style={{
            flex: 0.75,
            justifyContent: 'space-between',
            paddingVertical: spacing.sm,
            maxWidth: 320,
          }}
        >
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="label" color={colors.limeSoft}>
                Desk Monitor
              </AppText>
              <Pressable onPress={() => router.back()} hitSlop={12}>
                <AppText color={colors.limeSoft}>Close</AppText>
              </Pressable>
            </View>
            {isConnected ? (
              <View style={{ gap: spacing.lg }}>
                <SideMetric label="Balance" value={formatUsd(burn.accountBalance)} accent />
                <SideMetric label="Spend · today" value={formatUsd(burn.periodSpend)} />
                <SideMetric label="Pace / day" value={formatUsd(burn.avgDailySpend)} />
                <SideMetric label="Runway" value={burn.runwayLabel} />
                {burn.projectedZeroDate ? (
                  <AppText variant="caption" color={colors.textMuted}>
                    Est. empty {formatShortDate(burn.projectedZeroDate)}
                  </AppText>
                ) : null}
              </View>
            ) : null}
          </View>

          {isConnected && maskedKey ? (
            <AppText variant="caption" color={colors.textMuted}>
              {meta?.isManagementKey ? 'Management key' : 'API key'} · {maskedKey}
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function SideMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={{ gap: 4 }}>
      <AppText variant="label" style={{ fontSize: 11 }}>
        {label}
      </AppText>
      <AppText
        variant="mono"
        selectable
        color={accent ? colors.lime : colors.text}
        style={{ fontSize: accent ? 28 : 20, letterSpacing: accent ? -0.5 : 0 }}
      >
        {value}
      </AppText>
    </View>
  );
}
