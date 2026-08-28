import {
  formatUsd,
  type BurnSnapshot,
} from '@/lib/analytics/burn';
import { timeframeLabel, type TimeframeId } from '@/lib/analytics/timeframe';
import { pushBalanceWidgetSnapshot } from '@/lib/widgets/widget-runtime';

import type { BalanceWidgetProps } from '@/widgets/BalanceWidget';

const DISCONNECTED: BalanceWidgetProps = {
  connected: false,
  balanceLabel: '—',
  spendLabel: '—',
  spendCaption: 'Spend',
  runwayLabel: '—',
  avgDailyLabel: '—',
};

const LOADING: BalanceWidgetProps = {
  connected: true,
  balanceLabel: '…',
  spendLabel: '—',
  spendCaption: 'Spend · Today',
  runwayLabel: '—',
  avgDailyLabel: '—',
};

function pushBalanceSnapshot(props: BalanceWidgetProps) {
  pushBalanceWidgetSnapshot(props);
}

export function syncBalanceWidgetDisconnected() {
  pushBalanceSnapshot(DISCONNECTED);
}

export function syncBalanceWidgetLoading() {
  pushBalanceSnapshot(LOADING);
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
