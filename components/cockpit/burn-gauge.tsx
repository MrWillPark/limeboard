import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Polyline } from 'react-native-svg';

import { GaugeFillPath, GaugeNeedleSvg, GaugeRangeRow } from '@/components/shared/animated-gauge';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { useGaugeMotion } from '@/hooks/use-gauge-motion';
import {
  formatPeakAvg,
  formatRatePerSecondCompact,
  gaugeRangeCopy,
  spendGaugeMaxScale,
  tokenGaugeMaxScale,
  type BurnRateSnapshot,
} from '@/lib/analytics/burn-rate';
import {
  GAUGE_START_ANGLE,
  GAUGE_SWEEP,
  gaugePolar,
  gaugeTrackPath,
  gaugeValueToRatio,
} from '@/lib/ui/gauge-geometry';

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

  const [laidOut, setLaidOut] = useState(false);
  const range = useMemo(() => gaugeRangeCopy(maxScale, snapshot.mode), [maxScale, snapshot.mode]);
  const targetRatio = gaugeValueToRatio(snapshot.currentPerSecond, maxScale);
  const { ratio } = useGaugeMotion(targetRatio, Boolean(!isLoading && laidOut));

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
          <View
            style={{ width: GAUGE_WIDTH, alignItems: 'center' }}
            accessibilityRole="image"
            accessibilityLabel={`${title} ${formatRatePerSecondCompact(snapshot.currentPerSecond, snapshot.mode)} ${range.unit}. Scale ${range.span}, ${range.window}.`}
            onLayout={() => setLaidOut(true)}
          >
            <View style={{ width: GAUGE_WIDTH, height: SVG_HEIGHT }}>
              <Svg width={GAUGE_WIDTH} height={SVG_HEIGHT}>
                <Path
                  d={gaugeTrackPath(CX, CY, RADIUS)}
                  stroke={colors.border}
                  strokeWidth={7}
                  fill="none"
                  strokeLinecap="round"
                />
                <GaugeFillPath
                  cx={CX}
                  cy={CY}
                  radius={RADIUS}
                  strokeWidth={7}
                  color={colors.chartSelect}
                  ratio={ratio}
                  opacity={0.85}
                />
                {[0.5, 1].map((t) => {
                  const a = GAUGE_START_ANGLE + t * GAUGE_SWEEP;
                  const inner = gaugePolar(CX, CY, a, RADIUS - 10);
                  const outer = gaugePolar(CX, CY, a, RADIUS - 3);
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
                <GaugeNeedleSvg
                  cx={CX}
                  cy={CY}
                  length={RADIUS - 14}
                  ratio={ratio}
                  shaftColor={colors.text}
                  tipColor={colors.chartSelect}
                  hubFill={colors.panel}
                  hubStroke={colors.borderStrong}
                  hubR={4}
                  shaftWidth={1.5}
                  baseR={5}
                />
              </Svg>
            </View>
            <View style={{ alignItems: 'center', marginTop: -22, gap: 1 }}>
              <AppText
                variant="mono"
                selectable
                color={colors.lime}
                style={{ fontSize: 17, letterSpacing: -0.4 }}
              >
                {formatRatePerSecondCompact(snapshot.currentPerSecond, snapshot.mode)}
              </AppText>
              <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                {range.unit}
              </AppText>
            </View>
            <View style={{ width: '100%', marginTop: 6 }}>
              <GaugeRangeRow
                minLabel={range.minLabel}
                maxLabel={range.maxLabel}
                caption={range.caption}
                minHint="idle"
                maxHint="peak scale"
              />
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
        {range.span} · {snapshot.sourceLabel}
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
