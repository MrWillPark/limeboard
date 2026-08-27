import {
  formatPeakAvg,
  formatRatePerSecondCompact,
  formatRateUnit,
  type BurnRateSnapshot,
} from '@/lib/analytics/burn-rate';

import DeskMonitorWidget, {
  type DeskMonitorWidgetProps,
} from '@/widgets/DeskMonitorWidget';

const DISCONNECTED: DeskMonitorWidgetProps = {
  connected: false,
  mode: 'tokens',
  rateLabel: '—',
  rateUnit: 'tok/s',
  peakLabel: '—',
  avgLabel: '—',
  updatedLabel: '—',
  sourceLabel: '—',
  history: [],
};

function formatUpdatedLabel(lastUpdated: Date | null): string {
  if (!lastUpdated) return '—';
  const sec = Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  return `${Math.round(sec / 60)}m ago`;
}

function normalizeHistory(values: number[]): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values, 1);
  return values.map((v) => v / max);
}

export function syncDeskMonitorWidgetDisconnected() {
  DeskMonitorWidget.updateSnapshot(DISCONNECTED);
}

export function syncDeskMonitorWidget(snapshot: BurnRateSnapshot) {
  const props: DeskMonitorWidgetProps = {
    connected: true,
    mode: snapshot.mode,
    rateLabel: formatRatePerSecondCompact(snapshot.currentPerSecond, snapshot.mode),
    rateUnit: formatRateUnit(snapshot.mode),
    peakLabel: formatPeakAvg(snapshot.peakPerSecond, snapshot.mode),
    avgLabel: formatPeakAvg(snapshot.avgPerSecond, snapshot.mode),
    updatedLabel: formatUpdatedLabel(snapshot.lastUpdated),
    sourceLabel: snapshot.sourceLabel,
    history: normalizeHistory(snapshot.historyPerMinute),
  };
  DeskMonitorWidget.updateSnapshot(props);
}
