import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Line, Path, Polyline, RadialGradient, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';
import {
  formatPeakAvg,
  formatRatePerSecond,
  formatRatePerSecondCompact,
  formatRateUnit,
  spendGaugeMaxScale,
  tokenGaugeMaxScale,
  type BurnRateSnapshot,
} from '@/lib/analytics/burn-rate';

type Props = {
  snapshot: BurnRateSnapshot;
  size: number;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
  pollIntervalSec: number;
};

const START_ANGLE = 135;
const SWEEP = 270;

function polar(cx: number, cy: number, angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function arcPath(
  cx: number,
  cy: number,
  fromAngle: number,
  toAngle: number,
  radius: number
) {
  const start = polar(cx, cy, fromAngle, radius);
  const end = polar(cx, cy, toAngle, radius);
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
  const pad = 4;
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

export function DeskSpeedometer({
  snapshot,
  size,
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

  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const svgHeight = size * 0.72;

  const maxScale = useMemo(() => {
    if (snapshot.mode === 'spend') {
      return spendGaugeMaxScale(snapshot.currentPerSecond, snapshot.peakPerSecond);
    }
    return tokenGaugeMaxScale(snapshot.currentPerSecond, snapshot.peakPerSecond);
  }, [snapshot]);

  const needleAngle = valueToAngle(snapshot.currentPerSecond, maxScale);
  const needleTip = polar(cx, cy, needleAngle, radius - size * 0.08);
  const needleBaseL = polar(cx, cy, needleAngle - 90, size * 0.028);
  const needleBaseR = polar(cx, cy, needleAngle + 90, size * 0.028);
  const activeEnd = valueToAngle(snapshot.currentPerSecond, maxScale);

  const sparkPoints = useMemo(
    () => buildSparkPoints(snapshot.historyPerMinute, traceWidth, 48),
    [snapshot.historyPerMinute, traceWidth]
  );

  const title = snapshot.mode === 'tokens' ? 'Token burn' : 'Spend velocity';
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View style={{ flex: 1, gap: spacing.md }}>
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <View style={{ width: size, height: svgHeight, alignItems: 'center' }}>
          <LinearGradient
            colors={['rgba(57,255,20,0.12)', 'transparent']}
            style={{
              position: 'absolute',
              width: size * 1.1,
              height: size * 0.55,
              top: size * 0.08,
              borderRadius: size,
            }}
          />

          {isLoading ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <ActivityIndicator color={colors.limeSoft} size="large" />
            </View>
          ) : (
            <>
              <Svg width={size} height={svgHeight}>
                <Defs>
                  <RadialGradient id="gaugeGlow" cx="50%" cy="70%" r="50%">
                    <Stop offset="0%" stopColor={colors.lime} stopOpacity={0.35} />
                    <Stop offset="100%" stopColor={colors.lime} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={cx} cy={cy} r={radius * 0.92} fill="url(#gaugeGlow)" />

                <Path
                  d={arcPath(cx, cy, START_ANGLE, START_ANGLE + SWEEP, radius)}
                  stroke={colors.border}
                  strokeWidth={size * 0.028}
                  fill="none"
                  strokeLinecap="round"
                />
                {snapshot.currentPerSecond > 0 ? (
                  <Path
                    d={arcPath(cx, cy, START_ANGLE, activeEnd, radius)}
                    stroke={colors.lime}
                    strokeWidth={size * 0.028}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.9}
                  />
                ) : null}

                {ticks.map((t) => {
                  const a = START_ANGLE + t * SWEEP;
                  const inner = polar(cx, cy, a, radius - size * 0.06);
                  const outer = polar(cx, cy, a, radius - size * 0.02);
                  const major = t === 0 || t === 0.5 || t === 1;
                  return (
                    <Line
                      key={t}
                      x1={inner.x}
                      y1={inner.y}
                      x2={outer.x}
                      y2={outer.y}
                      stroke={major ? colors.limeSoft : colors.borderStrong}
                      strokeWidth={major ? 2 : 1}
                    />
                  );
                })}

                <Line
                  x1={cx}
                  y1={cy}
                  x2={needleTip.x}
                  y2={needleTip.y}
                  stroke={colors.text}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <Path
                  d={`M ${needleBaseL.x} ${needleBaseL.y} L ${needleTip.x} ${needleTip.y} L ${needleBaseR.x} ${needleBaseR.y} Z`}
                  fill={colors.lime}
                />
                <Circle
                  cx={cx}
                  cy={cy}
                  r={size * 0.024}
                  fill={colors.panel}
                  stroke={colors.limeSoft}
                  strokeWidth={2}
                />
              </Svg>

              <View style={{ alignItems: 'center', marginTop: -size * 0.14, gap: 2 }}>
                <AppText variant="label" color={colors.limeSoft} style={{ letterSpacing: 2 }}>
                  {title.toUpperCase()}
                </AppText>
                <AppText
                  variant="mono"
                  selectable
                  color={colors.lime}
                  style={{ fontSize: size * 0.14, letterSpacing: -1, lineHeight: size * 0.15 }}
                >
                  {formatRatePerSecondCompact(snapshot.currentPerSecond, snapshot.mode)}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 14 }}>
                  {formatRateUnit(snapshot.mode)}
                </AppText>
              </View>
            </>
          )}
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingHorizontal: spacing.md,
        }}
      >
        <HeroStat label="Now" value={formatRatePerSecond(snapshot.currentPerSecond, snapshot.mode)} />
        <HeroStat label="Peak" value={formatPeakAvg(snapshot.peakPerSecond, snapshot.mode)} />
        <HeroStat label="Avg · 30m" value={formatPeakAvg(snapshot.avgPerSecond, snapshot.mode)} />
      </View>

      <View style={{ paddingHorizontal: spacing.md, gap: 4 }} onLayout={onTraceLayout}>
        <AppText variant="label" style={{ fontSize: 10, textAlign: 'right' }}>
          Last 30m
        </AppText>
        {traceWidth > 0 && sparkPoints ? (
          <Svg width={traceWidth} height={48}>
            <Polyline
              points={sparkPoints}
              fill="none"
              stroke={colors.chartLine}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingBottom: spacing.sm,
        }}
      >
        {isFetching && !isLoading ? (
          <ActivityIndicator size="small" color={colors.limeSoft} />
        ) : null}
        <AppText variant="caption" color={colors.textMuted} style={{ textAlign: 'center' }}>
          Refresh · every {pollIntervalSec}s · updated {formatAgeSeconds(snapshot.lastUpdated, tick)}
          {error ? ` · ${error.message}` : ''}
          {snapshot.lagNote ? ` · ${snapshot.lagNote}` : ''}
        </AppText>
      </View>
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4, minWidth: 88 }}>
      <AppText variant="label" style={{ fontSize: 10 }}>
        {label}
      </AppText>
      <AppText variant="mono" selectable style={{ fontSize: 15 }}>
        {value}
      </AppText>
    </View>
  );
}
