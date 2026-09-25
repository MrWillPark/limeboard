import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { GaugeFillPath, GaugeNeedleSvg } from '@/components/shared/animated-gauge';
import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';
import { GAUGE_REST_MS, GAUGE_SWEEP_MS, useGaugeMotion } from '@/hooks/use-gauge-motion';
import {
  formatRatePerSecondCompact,
  formatRateUnit,
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
  gaugeValueToAngle,
  gaugeValueToRatio,
} from '@/lib/ui/gauge-geometry';

const ACCENT = {
  cyan: '#22D3EE',
  amber: colors.amber,
  purple: '#A78BFA',
} as const;

type GaugeProps = {
  snapshot: BurnRateSnapshot;
  size: number;
  isLoading?: boolean;
};

type ReadoutProps = {
  snapshot: BurnRateSnapshot;
  size: number;
};

const ARC_BOTTOM_SIN = Math.sin((135 * Math.PI) / 180);

function gaugeLayout(size: number) {
  const padTop = size * 0.07;
  const padBottom = size * 0.11;
  const radius = size * 0.38;
  const strokeWidth = size * 0.028;
  const cx = size / 2;
  const cy = padTop + radius + strokeWidth / 2;
  const svgHeight = cy + radius * ARC_BOTTOM_SIN + strokeWidth / 2 + padBottom;
  const glowWidth = size * 1.06;
  const glowHeight = size * 0.52;

  return {
    cx,
    cy,
    radius,
    strokeWidth,
    svgHeight,
    glowWidth,
    glowHeight,
    glowLeft: cx - glowWidth / 2,
    glowTop: cy - glowHeight / 2,
    glowCenterY: `${(cy / svgHeight) * 100}%`,
  };
}

export function DeskSpeedometer({ snapshot, size, isLoading }: GaugeProps) {
  const layout = useMemo(() => gaugeLayout(size), [size]);
  const { cx, cy, radius, strokeWidth, svgHeight, glowLeft, glowTop, glowWidth, glowHeight, glowCenterY } =
    layout;

  const maxScale = useMemo(() => {
    if (snapshot.mode === 'spend') {
      return spendGaugeMaxScale(snapshot.currentPerSecond, snapshot.peakPerSecond);
    }
    return tokenGaugeMaxScale(snapshot.currentPerSecond, snapshot.peakPerSecond);
  }, [snapshot]);

  const [laidOut, setLaidOut] = useState(false);
  const range = useMemo(() => gaugeRangeCopy(maxScale, snapshot.mode), [maxScale, snapshot.mode]);
  const targetRatio = gaugeValueToRatio(snapshot.currentPerSecond, maxScale);
  const { ratio, revealed } = useGaugeMotion(targetRatio, Boolean(!isLoading && laidOut));

  const peakAngle = gaugeValueToAngle(snapshot.peakPerSecond, maxScale);
  const peakMarker = gaugePolar(cx, cy, peakAngle, radius);
  const minAnchor = gaugePolar(cx, cy, GAUGE_START_ANGLE, radius + size * 0.055);
  const maxAnchor = gaugePolar(cx, cy, GAUGE_START_ANGLE + GAUGE_SWEEP, radius + size * 0.055);

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View
      style={{ width: size, height: svgHeight, alignItems: 'center', overflow: 'visible' }}
      accessibilityRole="image"
      accessibilityLabel={`${snapshot.mode === 'tokens' ? 'Token burn' : 'Spend velocity'} ${formatRatePerSecondCompact(snapshot.currentPerSecond, snapshot.mode)} ${formatRateUnit(snapshot.mode)}. Scale ${range.span}, ${range.window}.`}
      onLayout={() => setLaidOut(true)}
    >
      <LinearGradient
        colors={['rgba(34,211,238,0.08)', 'rgba(57,255,20,0.1)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          position: 'absolute',
          left: glowLeft,
          top: glowTop,
          width: glowWidth,
          height: glowHeight,
          borderRadius: glowHeight,
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
              <RadialGradient id="gaugeGlow" cx="50%" cy={glowCenterY} r="50%">
                <Stop offset="0%" stopColor={ACCENT.cyan} stopOpacity={0.2} />
                <Stop offset="45%" stopColor={colors.lime} stopOpacity={0.28} />
                <Stop offset="100%" stopColor={ACCENT.purple} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={cx} cy={cy} r={radius * 0.95} fill="url(#gaugeGlow)" opacity={0.7} />

            <Path
              d={gaugeTrackPath(cx, cy, radius)}
              stroke={colors.borderStrong}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
            <GaugeFillPath
              cx={cx}
              cy={cy}
              radius={radius}
              strokeWidth={strokeWidth}
              color={colors.lime}
              ratio={ratio}
            />

            {snapshot.peakPerSecond > 0 && revealed ? (
              <Circle cx={peakMarker.x} cy={peakMarker.y} r={size * 0.013} fill={ACCENT.amber} />
            ) : null}

            {ticks.map((t) => {
              const a = GAUGE_START_ANGLE + t * GAUGE_SWEEP;
              const inner = gaugePolar(cx, cy, a, radius - size * 0.06);
              const outer = gaugePolar(cx, cy, a, radius - size * 0.016);
              const major = t === 0 || t === 0.5 || t === 1;
              const tickColor =
                t === 1 ? ACCENT.amber : t === 0.5 ? ACCENT.cyan : colors.borderStrong;
              return (
                <Line
                  key={t}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={major ? tickColor : colors.borderStrong}
                  strokeWidth={major ? 2 : 1}
                  opacity={major ? 0.9 : 0.6}
                />
              );
            })}

            <GaugeNeedleSvg
              cx={cx}
              cy={cy}
              length={radius - size * 0.06}
              ratio={ratio}
              shaftColor={colors.text}
              tipColor={ACCENT.amber}
              hubFill={colors.panel}
              hubStroke={ACCENT.cyan}
              hubR={size * 0.024}
              shaftWidth={2.5}
              baseR={size * 0.024}
            />
          </Svg>

          {revealed ? (
            <Animated.View entering={FadeIn.duration(280)} style={StyleSheetAbsFill}>
              <View
                style={{
                  position: 'absolute',
                  left: minAnchor.x - 36,
                  top: minAnchor.y - 2,
                  width: 72,
                  alignItems: 'flex-start',
                }}
              >
                <AppText variant="mono" color={colors.textMuted} style={{ fontSize: size * 0.028 }}>
                  {range.minLabel}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} style={{ fontSize: size * 0.022, lineHeight: size * 0.028 }}>
                  idle
                </AppText>
              </View>
              <View
                style={{
                  position: 'absolute',
                  left: maxAnchor.x - 36,
                  top: maxAnchor.y - 2,
                  width: 72,
                  alignItems: 'flex-end',
                }}
              >
                <AppText variant="mono" color={colors.textSecondary} style={{ fontSize: size * 0.028 }}>
                  {range.maxLabel}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} style={{ fontSize: size * 0.022, lineHeight: size * 0.028 }}>
                  scale max
                </AppText>
              </View>
            </Animated.View>
          ) : null}
        </>
      )}
    </View>
  );
}

const StyleSheetAbsFill = { position: 'absolute' as const, left: 0, top: 0, right: 0, bottom: 0 };

export function DeskBurnReadout({ snapshot, size }: ReadoutProps) {
  const reduced = useReducedMotion();
  const title = snapshot.mode === 'tokens' ? 'Token burn' : 'Spend velocity';
  const maxScale =
    snapshot.mode === 'spend'
      ? spendGaugeMaxScale(snapshot.currentPerSecond, snapshot.peakPerSecond)
      : tokenGaugeMaxScale(snapshot.currentPerSecond, snapshot.peakPerSecond);
  const range = gaugeRangeCopy(maxScale, snapshot.mode);

  const body = (
    <View
      style={{
        alignItems: 'center',
        alignSelf: 'center',
        width: size,
        gap: 2,
        marginTop: spacing.xs,
      }}
    >
      <AppText
        variant="label"
        color={ACCENT.cyan}
        style={{ letterSpacing: 3, fontSize: 11, textAlign: 'center' }}
      >
        {title.toUpperCase()}
      </AppText>
      <AppText
        variant="mono"
        selectable
        color={colors.lime}
        style={{
          fontSize: size * 0.1,
          letterSpacing: -1,
          lineHeight: size * 0.11,
          textAlign: 'center',
        }}
      >
        {formatRatePerSecondCompact(snapshot.currentPerSecond, snapshot.mode)}
      </AppText>
      <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 12, textAlign: 'center' }}>
        {range.unit}
      </AppText>
      <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 11, textAlign: 'center' }}>
        {range.span}
      </AppText>
      <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 11, textAlign: 'center' }}>
        {range.caption}
      </AppText>
    </View>
  );

  if (reduced) return body;
  return (
    <Animated.View entering={FadeIn.delay(GAUGE_REST_MS + GAUGE_SWEEP_MS).duration(320)}>
      {body}
    </Animated.View>
  );
}

/** Total height of gauge + readout stack for layout sizing. */
export function deskHeroStackHeight(size: number, includeReadout: boolean) {
  const { svgHeight } = gaugeLayout(size);
  if (!includeReadout) return svgHeight;
  return svgHeight + spacing.xs + size * 0.11 + 72;
}
