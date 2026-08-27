import {
  formatUsd,
  type BurnSnapshot,
} from '@/lib/analytics/burn';
import { timeframeLabel, type TimeframeId } from '@/lib/analytics/timeframe';

import BalanceWidget, {
  type BalanceWidgetProps,
} from '@/widgets/BalanceWidget';

const DISCONNECTED: BalanceWidgetProps = {
  connected: false,
  balanceLabel: '—',
  spendLabel: '—',
  spendCaption: 'Spend',
  runwayLabel: '—',
  avgDailyLabel: '—',
};

export function syncBalanceWidgetDisconnected() {
  BalanceWidget.updateSnapshot(DISCONNECTED);
}

export function syncBalanceWidget(
  burn: BurnSnapshot,
  timeframe: TimeframeId
) {
  const props: BalanceWidgetProps = {
    connected: true,
    balanceLabel: formatUsd(burn.accountBalance),
    spendLabel: formatUsd(burn.periodSpend),
    spendCaption: `Spend · ${timeframeLabel(timeframe)}`,
    runwayLabel: burn.runwayLabel || '—',
    avgDailyLabel: formatUsd(burn.avgDailySpend),
  };
  BalanceWidget.updateSnapshot(props);
}
