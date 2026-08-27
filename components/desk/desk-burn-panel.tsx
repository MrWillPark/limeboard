import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Polyline, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';
import {
  formatPeakAvg,
  formatRatePerSecond,
  type BurnRateSnapshot,
} from '@/lib/analytics/burn-rate';

const ACCENT = {
  cyan: '#22D3EE',
  amber: colors.amber,
  purple: '#A78BFA',
} as const;

type Props = {
  snapshot: BurnRateSnapshot;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
  pollIntervalSec: number;
};

function formatAgeSeconds(updated: Date | null, tick: number) {
  void tick;
  if (!updated) return '—';
  const sec = Math.max(0, Math.round((Date.now() - updated.getTime()) / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  return `${Math.round(sec / 60)}m ago`;
}

function buildSparkPoints(values: number[], width: number, height: number): string {
  if (values.length < 2 || width <= 0) return '';
  const pad = 6;
  const max = Math.max(...values, 1);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * innerW;
      const y = pad + innerH - (v / max) * innerH;
      return `${x},${y}`;
    })
    .join(' ');
}

export function DeskBurnPanel({
  snapshot,
  isLoading,
  isFetching,
  error,
  pollIntervalSec,
}: Props) {
  const [tick, setTick] = useState(0);
  const [traceWidth, setTraceWidth] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const onTraceLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== traceWidth) setTraceWidth(w);
  };

  const sparkPoints = useMemo(
    () => buildSparkPoints(snapshot.historyPerMinute, traceWidth, 72),
    [snapshot.historyPerMinute, traceWidth]
  );

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <BurnStat
          label="Now"
          value={formatRatePerSecond(snapshot.currentPerSecond, snapshot.mode)}
          color={colors.lime}
        />
        <BurnStat
          label="Peak"
          value={formatPeakAvg(snapshot.peakPerSecond, snapshot.mode)}
          color={ACCENT.amber}
        />
        <BurnStat
          label="Avg · 30m"
          value={formatPeakAvg(snapshot.avgPerSecond, snapshot.mode)}
          color={ACCENT.cyan}
        />
      </View>

      <View
        style={{
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgElevated,
        }}
        onLayout={onTraceLayout}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="label" color={ACCENT.purple} style={{ fontSize: 10, letterSpacing: 1 }}>
            LAST 30M
          </AppText>
          {isFetching && !isLoading ? (
            <ActivityIndicator size="small" color={ACCENT.cyan} />
          ) : null}
        </View>
        {traceWidth > 0 && sparkPoints ? (
          <Svg width={Math.max(traceWidth - spacing.md * 2, 0)} height={72}>
            <Defs>
              <LinearGradient id="traceGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={ACCENT.purple} stopOpacity={0.5} />
                <Stop offset="50%" stopColor={ACCENT.cyan} stopOpacity={1} />
                <Stop offset="100%" stopColor={colors.lime} stopOpacity={0.9} />
              </LinearGradient>
            </Defs>
            <Polyline
              points={sparkPoints}
              fill="none"
              stroke="url(#traceGrad)"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
        ) : (
          <View style={{ height: 72, justifyContent: 'center' }}>
            <AppText variant="caption" color={colors.textMuted}>
              {isLoading ? 'Loading history…' : 'No history yet'}
            </AppText>
          </View>
        )}
      </View>

      <AppText variant="caption" color={colors.textMuted}>
        Refresh · every {pollIntervalSec}s · updated {formatAgeSeconds(snapshot.lastUpdated, tick)}
        {error ? ` · ${error.message}` : ''}
        {snapshot.lagNote ? ` · ${snapshot.lagNote}` : ''}
      </AppText>
    </View>
  );
}

function BurnStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
      <AppText variant="label" style={{ fontSize: 10 }}>
        {label}
      </AppText>
      <AppText
        variant="mono"
        selectable
        color={color}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{ fontSize: 16 }}
      >
        {value}
      </AppText>
    </View>
  );
}
