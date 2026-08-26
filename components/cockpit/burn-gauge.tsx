import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import {
  formatPeakAvg,
  formatRatePerSecondCompact,
  formatRateUnit,
  spendGaugeMaxScale,
  tokenGaugeMaxScale,
  type BurnRateSnapshot,
} from '@/lib/analytics/burn-rate';

type Props = {
  snapshot: BurnRateSnapshot;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
};

const GAUGE_WIDTH = 128;
const RADIUS = 48;
const CX = GAUGE_WIDTH / 2;
const CY = GAUGE_WIDTH / 2 + 6;
const SVG_HEIGHT = 96;
const START_ANGLE = 135;
const SWEEP = 270;

function polar(angleDeg: number, radius = RADIUS) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function arcPath(fromAngle: number, toAngle: number, radius = RADIUS) {
  const start = polar(fromAngle, radius);
  const end = polar(toAngle, radius);
  const large = toAngle - fromAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
}

function valueToAngle(value: number, max: number) {
  if (max <= 0) return START_ANGLE;
  const ratio = Math.max(0, Math.min(1, value / max));
  return START_ANGLE + ratio * SWEEP;
}

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
  const pad = 2;
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

const TRACE_HEIGHT = 56;

export function BurnGauge({ snapshot, isLoading, isFetching, error }: Props) {
  const [tick, setTick] = useState(0);
  const [traceWidth, setTraceWidth] = useState(0);

  const onTraceLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== traceWidth) setTraceWidth(w);
  };

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const maxScale = useMemo(() => {
    if (snapshot.mode === 'spend') {
      return spendGaugeMaxScale(snapshot.currentPerSecond, snapshot.peakPerSecond);
    }
    return tokenGaugeMaxScale(snapshot.currentPerSecond, snapshot.peakPerSecond);
  }, [snapshot]);

  const needleAngle = valueToAngle(snapshot.currentPerSecond, maxScale);
  const needleTip = polar(needleAngle, RADIUS - 14);
  const needleBaseL = polar(needleAngle - 90, 5);
  const needleBaseR = polar(needleAngle + 90, 5);
  const activeEnd = valueToAngle(snapshot.currentPerSecond, maxScale);

  const sparkValues = snapshot.historyPerMinute;
  const sparkPoints = useMemo(
    () => buildSparkPoints(sparkValues, traceWidth, TRACE_HEIGHT),
    [sparkValues, traceWidth]
  );

  const title = snapshot.mode === 'tokens' ? 'Token burn' : 'Spend velocity';

  return (
    <Panel style={{ gap: spacing.xs, padding: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="title" style={{ fontSize: 15 }}>
          {title}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isFetching && !isLoading ? (
            <ActivityIndicator size="small" color={colors.limeSoft} />
          ) : null}
          <AppText variant="caption" color={colors.textMuted}>
            {formatAgeSeconds(snapshot.lastUpdated, tick)}
          </AppText>
        </View>
      </View>

      {error ? (
        <AppText variant="caption" color={colors.red} selectable>
          {error.message}
        </AppText>
      ) : null}

      {isLoading ? (
        <View style={{ height: 96, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.limeSoft} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: GAUGE_WIDTH, alignItems: 'center' }}>
            <Svg width={GAUGE_WIDTH} height={SVG_HEIGHT}>
              <Path
                d={arcPath(START_ANGLE, START_ANGLE + SWEEP)}
                stroke={colors.border}
                strokeWidth={7}
                fill="none"
                strokeLinecap="round"
              />
              {snapshot.currentPerSecond > 0 ? (
                <Path
                  d={arcPath(START_ANGLE, activeEnd)}
                  stroke={colors.chartSelect}
                  strokeWidth={7}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.85}
                />
              ) : null}
              {[0.5, 1].map((t) => {
                const a = START_ANGLE + t * SWEEP;
                const inner = polar(a, RADIUS - 10);
                const outer = polar(a, RADIUS - 3);
                return (
                  <Line
                    key={t}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={colors.borderStrong}
                    strokeWidth={1}
                  />
                );
              })}
              <Line
                x1={CX}
                y1={CY}
                x2={needleTip.x}
                y2={needleTip.y}
                stroke={colors.text}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <Path
                d={`M ${needleBaseL.x} ${needleBaseL.y} L ${needleTip.x} ${needleTip.y} L ${needleBaseR.x} ${needleBaseR.y} Z`}
                fill={colors.chartSelect}
              />
              <Circle cx={CX} cy={CY} r={4} fill={colors.panel} stroke={colors.borderStrong} strokeWidth={1} />
            </Svg>
            <View style={{ alignItems: 'center', marginTop: -28 }}>
              <AppText
                variant="mono"
                selectable
                color={colors.lime}
                style={{ fontSize: 17, letterSpacing: -0.4 }}
              >
                {formatRatePerSecondCompact(snapshot.currentPerSecond, snapshot.mode)}
              </AppText>
              <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                {formatRateUnit(snapshot.mode)}
              </AppText>
            </View>
          </View>

          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ gap: 8, justifyContent: 'center' }}>
              <Stat label="Peak" value={formatPeakAvg(snapshot.peakPerSecond, snapshot.mode)} />
              <Stat label="Avg · 30m" value={formatPeakAvg(snapshot.avgPerSecond, snapshot.mode)} />
            </View>

            <View
              style={{ flex: 1, justifyContent: 'center', minHeight: SVG_HEIGHT }}
              onLayout={onTraceLayout}
            >
              {sparkValues.length >= 2 ? (
                <View style={{ gap: 3, flex: 1, justifyContent: 'center' }}>
                  <AppText variant="label" style={{ fontSize: 9, textAlign: 'right' }}>
                    Last 30m
                  </AppText>
                  {traceWidth > 0 && sparkPoints ? (
                    <Svg width={traceWidth} height={TRACE_HEIGHT}>
                      <Polyline
                        points={sparkPoints}
                        fill="none"
                        stroke={colors.chartLine}
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </Svg>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      )}

      <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
        {snapshot.mode === 'tokens' ? '3-min rolling avg' : 'Poll delta'} · {snapshot.sourceLabel}
        {snapshot.lagNote ? ` · ${snapshot.lagNote}` : ''}
      </AppText>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 1 }}>
      <AppText variant="label" style={{ fontSize: 9 }}>
        {label}
      </AppText>
      <AppText variant="mono" selectable style={{ fontSize: 13 }}>
        {value}
      </AppText>
    </View>
  );
}
