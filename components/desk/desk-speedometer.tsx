import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';
import {
  formatRatePerSecondCompact,
  formatRateUnit,
  spendGaugeMaxScale,
  tokenGaugeMaxScale,
  type BurnRateSnapshot,
} from '@/lib/analytics/burn-rate';

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

const START_ANGLE = 135;
const SWEEP = 270;
const ARC_BOTTOM_SIN = Math.sin((135 * Math.PI) / 180);

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

function gaugeLayout(size: number) {
  const padTop = size * 0.07;
  const padBottom = size * 0.03;
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

  const needleAngle = valueToAngle(snapshot.currentPerSecond, maxScale);
  const peakAngle = valueToAngle(snapshot.peakPerSecond, maxScale);
  const needleTip = polar(cx, cy, needleAngle, radius - size * 0.06);
  const needleBaseL = polar(cx, cy, needleAngle - 90, size * 0.024);
  const needleBaseR = polar(cx, cy, needleAngle + 90, size * 0.024);
  const activeEnd = valueToAngle(snapshot.currentPerSecond, maxScale);
  const peakMarker = polar(cx, cy, peakAngle, radius);

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View style={{ width: size, height: svgHeight, alignItems: 'center', overflow: 'visible' }}>
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
        <Svg width={size} height={svgHeight}>
          <Defs>
            <RadialGradient id="gaugeGlow" cx="50%" cy={glowCenterY} r="50%">
              <Stop offset="0%" stopColor={ACCENT.cyan} stopOpacity={0.2} />
              <Stop offset="45%" stopColor={colors.lime} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={ACCENT.purple} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={cx} cy={cy} r={radius * 0.95} fill="url(#gaugeGlow)" />

          <Path
            d={arcPath(cx, cy, START_ANGLE, START_ANGLE + SWEEP, radius)}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          {snapshot.currentPerSecond > 0 ? (
            <Path
              d={arcPath(cx, cy, START_ANGLE, activeEnd, radius)}
              stroke={colors.lime}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              opacity={0.95}
            />
          ) : null}

          {snapshot.peakPerSecond > 0 ? (
            <Circle cx={peakMarker.x} cy={peakMarker.y} r={size * 0.013} fill={ACCENT.amber} />
          ) : null}

          {ticks.map((t) => {
            const a = START_ANGLE + t * SWEEP;
            const inner = polar(cx, cy, a, radius - size * 0.06);
            const outer = polar(cx, cy, a, radius - size * 0.016);
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
            fill={ACCENT.amber}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={size * 0.024}
            fill={colors.panel}
            stroke={ACCENT.cyan}
            strokeWidth={2}
          />
        </Svg>
      )}
    </View>
  );
}

export function DeskBurnReadout({ snapshot, size }: ReadoutProps) {
  const title = snapshot.mode === 'tokens' ? 'Token burn' : 'Spend velocity';

  return (
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
        {formatRateUnit(snapshot.mode)}
      </AppText>
    </View>
  );
}

/** Total height of gauge + readout stack for layout sizing. */
export function deskHeroStackHeight(size: number, includeReadout: boolean) {
  const { svgHeight } = gaugeLayout(size);
  if (!includeReadout) return svgHeight;
  return svgHeight + spacing.xs + size * 0.1 + 32;
}
