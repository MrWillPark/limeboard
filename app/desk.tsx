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

import { DeskBurnPanel } from '@/components/desk/desk-burn-panel';
import { DeskFinancePanel } from '@/components/desk/desk-finance-panel';
import { DeskBurnReadout, DeskSpeedometer, deskHeroStackHeight } from '@/components/desk/desk-speedometer';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';
import { computeBurn } from '@/lib/analytics/burn';
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

const ACCENT = {
  cyan: '#22D3EE',
} as const;

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

  const readoutReserve = 40;
  const keyReserve = 20;
  const gaugeSize = Math.min(
    width * 0.64,
    (height - readoutReserve - keyReserve - spacing.lg * 2) * 0.98,
    680
  );
  // Shrink gauge slightly if the hero stack (gauge + readout) would overflow vertically.
  const heroSize =
    deskHeroStackHeight(gaugeSize, true) > height - keyReserve - spacing.lg * 2
      ? gaugeSize * 0.92
      : gaugeSize;

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
        colors={[
          'rgba(34,211,238,0.04)',
          'rgba(57,255,20,0.05)',
          'rgba(167,139,250,0.03)',
        ]}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.lg,
          gap: spacing.xxl,
        }}
      >
        <View style={{ flex: 1.35 }}>
          {!isConnected ? (
            <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md, maxWidth: 420 }}>
              <AppText variant="title">Connect to monitor burn</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Link your OpenRouter key to see live velocity on this screen.
              </AppText>
              <AppButton title="Connect OpenRouter" onPress={() => router.push('/connect')} />
            </View>
          ) : (
            <>
              {maskedKey ? (
                <AppText
                  variant="caption"
                  color={colors.textMuted}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  style={{ fontSize: 11, opacity: 0.55, paddingTop: spacing.xs }}
                >
                  {meta?.isManagementKey ? 'Management key' : 'API key'} · {maskedKey}
                </AppText>
              ) : null}

              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: heroSize, alignItems: 'center' }}>
                  <DeskSpeedometer
                    snapshot={burnRate.snapshot}
                    size={heroSize}
                    isLoading={burnRate.isLoading}
                  />
                  {!burnRate.isLoading ? (
                    <DeskBurnReadout snapshot={burnRate.snapshot} size={heroSize} />
                  ) : null}
                </View>
              </View>
            </>
          )}
        </View>

        <View
          style={{
            flex: 0.65,
            justifyContent: 'space-between',
            paddingVertical: spacing.sm,
            minWidth: 280,
            maxWidth: 380,
            borderLeftWidth: 1,
            borderLeftColor: colors.border,
            paddingLeft: spacing.xl,
            gap: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="label" color={ACCENT.cyan}>
              Desk Monitor
            </AppText>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <AppText color={colors.textSecondary}>Close</AppText>
            </Pressable>
          </View>

          {isConnected ? (
            <View style={{ flex: 1, gap: spacing.lg }}>
              <DeskFinancePanel burn={burn} />
              <DeskBurnPanel
                snapshot={burnRate.snapshot}
                isLoading={burnRate.isLoading}
                isFetching={burnRate.isFetching}
                error={burnRate.error}
                pollIntervalSec={POLL_INTERVAL_SEC}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
