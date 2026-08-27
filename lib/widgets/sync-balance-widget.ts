import {
  formatUsd,
  type BurnSnapshot,
} from '@/lib/analytics/burn';
import { timeframeLabel, type TimeframeId } from '@/lib/analytics/timeframe';
import { isWidgetSyncAvailable } from '@/lib/widgets/widget-sync-available';

import type { BalanceWidgetProps } from '@/widgets/BalanceWidget';

const DISCONNECTED: BalanceWidgetProps = {
  connected: false,
  balanceLabel: '—',
  spendLabel: '—',
  spendCaption: 'Spend',
  runwayLabel: '—',
  avgDailyLabel: '—',
};

function pushBalanceSnapshot(props: BalanceWidgetProps) {
  if (!isWidgetSyncAvailable()) return;
  try {
    // Lazy load — expo-widgets is not available in Expo Go.
    const BalanceWidget = require('@/widgets/BalanceWidget').default;
    BalanceWidget.updateSnapshot(props);
  } catch {
    // Native widget extension not present in this build.
  }
}

export function syncBalanceWidgetDisconnected() {
  pushBalanceSnapshot(DISCONNECTED);
}

export function syncBalanceWidget(
  burn: BurnSnapshot,
  timeframe: TimeframeId
) {
  pushBalanceSnapshot({
    connected: true,
    balanceLabel: formatUsd(burn.accountBalance),
    spendLabel: formatUsd(burn.periodSpend),
    spendCaption: `Spend · ${timeframeLabel(timeframe)}`,
    runwayLabel: burn.runwayLabel || '—',
    avgDailyLabel: formatUsd(burn.avgDailySpend),
  });
}
