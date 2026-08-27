import { useMemo } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Polyline, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { usePlatformRankings } from '@/hooks/use-platform-rankings';
import {
  formatTokenCount,
  formatTokensPerSecond,
  type PlatformModelRank,
  type PlatformRankingsSnapshot,
  type PlatformVolumePoint,
} from '@/lib/platform/rankings';

type Props = {
  compact?: boolean;
};

const GAUGE_SIZE = 168;
const GAUGE_RADIUS = 62;
const GAUGE_CX = GAUGE_SIZE / 2;
const GAUGE_CY = GAUGE_SIZE / 2 + 10;
const START_ANGLE = 135;
const SWEEP = 270;

function polar(angleDeg: number, radius = GAUGE_RADIUS) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: GAUGE_CX + radius * Math.cos(rad),
    y: GAUGE_CY + radius * Math.sin(rad),
  };
}

function arcPath(fromAngle: number, toAngle: number, radius = GAUGE_RADIUS) {
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

function isUsableSnapshot(
  data: PlatformRankingsSnapshot | null | undefined
): data is PlatformRankingsSnapshot {
  return Boolean(
    data &&
      Array.isArray(data.topModels) &&
      Array.isArray(data.volumeSeries) &&
      Number.isFinite(data.tokensPerSecond) &&
      Number.isFinite(data.totalTokens) &&
      Number.isFinite(data.peakDayTokens) &&
      Number.isFinite(data.leaderShare)
  );
}

export function PlatformPulse({ compact }: Props) {
  const { data, isLoading, isError } = usePlatformRankings();

  if (compact) {
    return <PlatformPulseCompact data={data} isLoading={isLoading} isError={isError} />;
  }

  return (
    <Panel accent padded={false} style={{ overflow: 'hidden' }}>
      <LinearGradient
        colors={['rgba(57,255,20,0.16)', 'rgba(57,255,20,0.03)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ padding: spacing.lg, gap: spacing.lg }}
      >
        <Animated.View entering={FadeIn.duration(400)} style={{ gap: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <AppText variant="label" color={colors.limeSoft}>
              Platform pulse
            </AppText>
            <LiveDot />
          </View>
          <AppText variant="display" style={{ fontSize: 26 }}>
            OpenRouter live
          </AppText>
          <AppText color={colors.textSecondary}>
            Ecosystem throughput and model share — no API key required.
          </AppText>
        </Animated.View>

        {isLoading ? (
          <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.limeSoft} size="large" />
          </View>
        ) : isError || !isUsableSnapshot(data) ? (
          <AppText variant="caption" color={colors.textSecondary}>
            Platform stats are syncing. Check back soon or connect your key for personal
            metrics.
          </AppText>
        ) : (
          <>
            <PlatformHeroGauge data={data} />
            <VolumeTrend series={data.volumeSeries} />
            <ModelShareBoard models={data.topModels} />
            {data.syncedAt ? (
              <AppText variant="caption" color={colors.textMuted}>
                Cached · {data.date} UTC · synced {new Date(data.syncedAt).toLocaleString()}
              </AppText>
            ) : null}
          </>
        )}
      </LinearGradient>
    </Panel>
  );
}

function LiveDot() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          backgroundColor: colors.lime,
        }}
      />
      <AppText variant="caption" color={colors.limeSoft} style={{ fontSize: 11 }}>
        LIVE CACHE
      </AppText>
    </View>
  );
}

function PlatformHeroGauge({ data }: { data: PlatformRankingsSnapshot }) {
  const tps = data.tokensPerSecond;
  const peak = Math.max(data.peakDayTokens, 1);
  const maxTps = Math.max(peak / 86_400, tps * 1.15, 1);
  const activeEnd = valueToAngle(tps, maxTps);
  const needleTip = polar(activeEnd, GAUGE_RADIUS - 16);
  const needleBaseL = polar(activeEnd - 90, 6);
  const needleBaseR = polar(activeEnd + 90, 6);
  const vsPeak = Math.round((data.totalTokens / peak) * 100);

  return (
    <Animated.View
      entering={FadeInDown.delay(60).duration(450)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
      }}
    >
      <View style={{ width: GAUGE_SIZE, alignItems: 'center' }}>
        <Svg width={GAUGE_SIZE} height={GAUGE_SIZE - 12}>
          <Defs>
            <SvgGradient id="pulseArc" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={colors.limeSoft} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={colors.lime} stopOpacity="1" />
            </SvgGradient>
          </Defs>
          <Path
            d={arcPath(START_ANGLE, START_ANGLE + SWEEP)}
            stroke={colors.borderStrong}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
          />
          {tps > 0 ? (
            <Path
              d={arcPath(START_ANGLE, Math.max(START_ANGLE + 0.5, activeEnd))}
              stroke="url(#pulseArc)"
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
            />
          ) : null}
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const a = START_ANGLE + t * SWEEP;
            const inner = polar(a, GAUGE_RADIUS - 14);
            const outer = polar(a, GAUGE_RADIUS - 4);
            return (
              <Line
                key={t}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={colors.borderStrong}
                strokeWidth={1.5}
              />
            );
          })}
          <Line
            x1={GAUGE_CX}
            y1={GAUGE_CY}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={colors.text}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d={`M ${needleBaseL.x} ${needleBaseL.y} L ${needleTip.x} ${needleTip.y} L ${needleBaseR.x} ${needleBaseR.y} Z`}
            fill={colors.lime}
          />
          <Circle
            cx={GAUGE_CX}
            cy={GAUGE_CY}
            r={5}
            fill={colors.panel}
            stroke={colors.limeGlow}
            strokeWidth={2}
          />
        </Svg>
        <View style={{ alignItems: 'center', marginTop: -36, gap: 2 }}>
          <AppText
            variant="mono"
            color={colors.lime}
            style={{ fontSize: 22, fontFamily: fonts.monoBold, letterSpacing: -0.8 }}
          >
            {formatTokensPerSecond(tps)}
          </AppText>
          <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
            tok/sec · est.
          </AppText>
        </View>
      </View>

      <View style={{ flex: 1, gap: spacing.md }}>
        <HeroStat
          label="Day volume"
          value={formatTokenCount(data.totalTokens)}
          hint="tokens"
        />
        <HeroStat
          label="Leader"
          value={data.leaderModel || '—'}
          hint={`${Math.round(data.leaderShare * 100)}% share`}
        />
        <HeroStat
          label="Vs peak day"
          value={`${Number.isFinite(vsPeak) ? vsPeak : 0}%`}
          hint="of 14d high"
        />
      </View>
    </Animated.View>
  );
}

function HeroStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="label" style={{ fontSize: 10 }}>
        {label}
      </AppText>
      <AppText
        variant="mono"
        numberOfLines={1}
        style={{ fontSize: 16, fontFamily: fonts.monoMedium }}
      >
        {value}
      </AppText>
      <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
        {hint}
      </AppText>
    </View>
  );
}

function VolumeTrend({ series }: { series: PlatformVolumePoint[] }) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.max(screenWidth - spacing.lg * 4, 240);
  const height = 72;

  const points = useMemo(() => {
    if (!series || series.length < 2) return '';
    const values = series.map((p) => p.tokens);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    const pad = 4;
    return values
      .map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (chartWidth - pad * 2);
        const y = pad + (height - pad * 2) - ((v - min) / range) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(' ');
  }, [series, chartWidth]);

  if (!series || series.length < 2 || !points) return null;

  const first = series[0]!.date.slice(5);
  const last = series[series.length - 1]!.date.slice(5);

  return (
    <Animated.View entering={FadeInDown.delay(120).duration(450)} style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="label">14-day volume</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {first} → {last}
        </AppText>
      </View>
      <View
        style={{
          borderRadius: radii.md,
          borderCurve: 'continuous',
          backgroundColor: colors.bgElevated,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.xs,
        }}
      >
        <Svg width={chartWidth} height={height}>
          <Polyline
            points={points}
            fill="none"
            stroke={colors.limeSoft}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.9}
          />
        </Svg>
      </View>
    </Animated.View>
  );
}

function ModelShareBoard({ models }: { models: PlatformModelRank[] }) {
  if (!models.length) return null;
  const max = Math.max(...models.map((m) => m.tokens), 1);

  return (
    <Animated.View entering={FadeInDown.delay(180).duration(450)} style={{ gap: spacing.md }}>
      <AppText variant="label">Top models</AppText>
      <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'center' }}>
        <ShareRing models={models} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          {models.slice(0, 5).map((model, index) => (
            <ModelBar
              key={model.slug}
              model={model}
              rank={index + 1}
              max={max}
              color={colors.chart[index % colors.chart.length]!}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function ShareRing({ models }: { models: PlatformModelRank[] }) {
  const size = 96;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = models.reduce((s, m) => s + m.tokens, 0) || 1;
  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {models.slice(0, 5).map((model, index) => {
          const length = (model.tokens / total) * circumference;
          const dashoffset = -offset;
          offset += length;
          return (
            <Circle
              key={model.slug}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.chart[index % colors.chart.length]}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <AppText variant="mono" style={{ fontSize: 13, fontFamily: fonts.monoBold }}>
          {models.length}
        </AppText>
        <AppText variant="caption" style={{ fontSize: 9 }}>
          models
        </AppText>
      </View>
    </View>
  );
}

function ModelBar({
  model,
  rank,
  max,
  color,
}: {
  model: PlatformModelRank;
  rank: number;
  max: number;
  color: string;
}) {
  const pct = Math.max((model.tokens / max) * 100, 2);

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <AppText variant="caption" color={colors.text} numberOfLines={1} style={{ flex: 1 }}>
          {rank}. {model.label}
        </AppText>
        <AppText variant="mono" style={{ fontSize: 11 }}>
          {formatTokenCount(model.tokens)}
        </AppText>
      </View>
      <View
        style={{
          height: 7,
          borderRadius: 999,
          backgroundColor: colors.border,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: color,
            borderRadius: 999,
          }}
        />
      </View>
    </View>
  );
}

function PlatformPulseCompact({
  data,
  isLoading,
  isError,
}: {
  data: PlatformRankingsSnapshot | null | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <Panel style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="label" color={colors.limeSoft}>
          Platform pulse
        </AppText>
        <LiveDot />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.limeSoft} />
      ) : isError || !isUsableSnapshot(data) ? (
        <AppText variant="caption" color={colors.textSecondary}>
          Ecosystem rankings · syncing
        </AppText>
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <View style={{ gap: 2, flex: 1 }}>
            <AppText variant="mono" color={colors.lime} style={{ fontSize: 18 }}>
              {formatTokensPerSecond(data.tokensPerSecond)}
              <AppText variant="caption" color={colors.textMuted}>
                {' '}
                tok/s
              </AppText>
            </AppText>
            <AppText variant="caption">
              {formatTokenCount(data.totalTokens)} · {data.leaderModel}{' '}
              {Math.round(data.leaderShare * 100)}%
            </AppText>
          </View>
          <MiniBars models={data.topModels.slice(0, 4)} />
        </View>
      )}
    </Panel>
  );
}

function MiniBars({ models }: { models: PlatformModelRank[] }) {
  const max = Math.max(...models.map((m) => m.tokens), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 40 }}>
      {models.map((m, i) => (
        <View
          key={m.slug}
          style={{
            width: 10,
            height: Math.max(6, (m.tokens / max) * 40),
            borderRadius: 3,
            backgroundColor: colors.chart[i % colors.chart.length],
            opacity: 0.9,
          }}
        />
      ))}
    </View>
  );
}
