import {
  formatUsd,
  type BurnSnapshot,
} from '@/lib/analytics/burn';
import { timeframeLabel, type TimeframeId } from '@/lib/analytics/timeframe';
import { syncLiveBurnActivity } from '@/lib/live-activity/sync-live-burn';
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
    const BalanceWidget = require('@/widgets/BalanceWidget').default;
    BalanceWidget.updateSnapshot(props);
  } catch {
    // Native widget extension not present in this build.
  }
}

export function syncBalanceWidgetDisconnected() {
  pushBalanceSnapshot(DISCONNECTED);
  syncLiveBurnActivity({
    balanceLabel: '—',
    burnPerSecondLabel: '—',
    runwayLabel: '—',
    updatedAt: Date.now(),
  });
}

export function syncBalanceWidget(
  burn: BurnSnapshot,
  timeframe: TimeframeId,
  burnPerSecondLabel?: string
) {
  pushBalanceSnapshot({
    connected: true,
    balanceLabel: formatUsd(burn.accountBalance),
    spendLabel: formatUsd(burn.periodSpend),
    spendCaption: `Spend · ${timeframeLabel(timeframe)}`,
    runwayLabel: burn.runwayLabel || '—',
    avgDailyLabel: formatUsd(burn.avgDailySpend),
  });
  syncLiveBurnActivity({
    balanceLabel: formatUsd(burn.accountBalance),
    burnPerSecondLabel: burnPerSecondLabel ?? '—',
    runwayLabel: burn.runwayLabel || '—',
    updatedAt: Date.now(),
  });
}
