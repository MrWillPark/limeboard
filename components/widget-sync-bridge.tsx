import { useEffect, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { computeBurn } from '@/lib/analytics/burn';
import { computeFleetPeriodSpend } from '@/lib/analytics/timeframe';
import {
  syncBalanceWidget,
  syncBalanceWidgetDisconnected,
} from '@/lib/widgets/sync-balance-widget';
import {
  syncDeskMonitorWidget,
  syncDeskMonitorWidgetDisconnected,
} from '@/lib/widgets/sync-desk-monitor-widget';
import { bootstrapWidgetLayouts } from '@/lib/widgets/widget-runtime';
import { useActivity, useCredits, useKeyInfo, useManagedKeys } from '@/hooks/use-openrouter';
import { useBurnRate } from '@/hooks/use-burn-rate';
import { useOpenRouter } from '@/providers/openrouter-provider';

/** Widgets mirror Cockpit with a fixed 7-day window for spend/runway labels. */
const WIDGET_TIMEFRAME = '7d' as const;

/**
 * Keeps home-screen widgets fresh without requiring the Cockpit tab to stay mounted.
 * OpenRouterProvider still pushes loading/disconnected placeholders on auth changes.
 */
export function WidgetSyncBridge() {
  const { ready, realIsConnected, meta } = useOpenRouter();

  const keyQuery = useKeyInfo();
  const creditsQuery = useCredits();
  const activityQuery = useActivity();
  const keysQuery = useManagedKeys();

  const activity = activityQuery.data ?? [];

  const burn = useMemo(
    () =>
      computeBurn(keyQuery.data, creditsQuery.data, activity, WIDGET_TIMEFRAME, {
        fleetKeys: keysQuery.data,
        isManagementKey: meta?.isManagementKey,
      }),
    [
      keyQuery.data,
      creditsQuery.data,
      activity,
      keysQuery.data,
      meta?.isManagementKey,
    ]
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
    enabled: realIsConnected,
    isManagementKey: meta?.isManagementKey,
    liveSpend: liveTodaySpend,
  });

  useEffect(() => {
    bootstrapWidgetLayouts(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!realIsConnected) {
      syncBalanceWidgetDisconnected();
      syncDeskMonitorWidgetDisconnected();
      return;
    }

    syncBalanceWidget(burn, WIDGET_TIMEFRAME);
  }, [
    ready,
    realIsConnected,
    burn,
    keyQuery.dataUpdatedAt,
    creditsQuery.dataUpdatedAt,
  ]);

  useEffect(() => {
    if (!ready || !realIsConnected) return;
    syncDeskMonitorWidget(burnRate.snapshot);
  }, [
    ready,
    realIsConnected,
    burnRate.snapshot,
    keyQuery.dataUpdatedAt,
    activityQuery.dataUpdatedAt,
  ]);

  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      if (state !== 'active' || !ready || !realIsConnected) return;

      bootstrapWidgetLayouts(true);
      keyQuery.refetch();
      creditsQuery.refetch();
      activityQuery.refetch();
      keysQuery.refetch();
      burnRate.refetch();
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [
    ready,
    realIsConnected,
    keyQuery,
    creditsQuery,
    activityQuery,
    keysQuery,
    burnRate,
  ]);

  return null;
}
