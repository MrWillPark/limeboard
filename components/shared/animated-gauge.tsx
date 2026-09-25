import { View } from 'react-native';
import { Circle, Line, Path } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { colors } from '@/constants/theme';
import {
  GAUGE_START_ANGLE,
  GAUGE_SWEEP,
  gaugeArcPath,
  gaugePolar,
} from '@/lib/ui/gauge-geometry';

type FillProps = {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  color: string;
  ratio: number;
  opacity?: number;
};

export function GaugeFillPath({
  cx,
  cy,
  radius,
  strokeWidth,
  color,
  ratio,
  opacity = 0.95,
}: FillProps) {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped < 0.004) return null;
  return (
    <Path
      d={gaugeArcPath(cx, cy, GAUGE_START_ANGLE, GAUGE_START_ANGLE + clamped * GAUGE_SWEEP, radius)}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      opacity={opacity}
    />
  );
}

type NeedleProps = {
  cx: number;
  cy: number;
  length: number;
  ratio: number;
  shaftColor?: string;
  tipColor?: string;
  hubFill?: string;
  hubStroke?: string;
  hubR?: number;
  shaftWidth?: number;
  baseR?: number;
};

export function GaugeNeedleSvg({
  cx,
  cy,
  length,
  ratio,
  shaftColor = colors.text,
  tipColor = colors.lime,
  hubFill = colors.panel,
  hubStroke = colors.borderStrong,
  hubR = 5,
  shaftWidth = 2,
  baseR,
}: NeedleProps) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const angle = GAUGE_START_ANGLE + clamped * GAUGE_SWEEP;
  const tip = gaugePolar(cx, cy, angle, length);
  const wing = baseR ?? Math.max(3.5, hubR * 0.85);
  const baseL = gaugePolar(cx, cy, angle - 90, wing);
  const baseRPt = gaugePolar(cx, cy, angle + 90, wing);

  return (
    <>
      <Line
        x1={cx}
        y1={cy}
        x2={tip.x}
        y2={tip.y}
        stroke={shaftColor}
        strokeWidth={shaftWidth}
        strokeLinecap="round"
      />
      <Path
        d={`M ${baseL.x} ${baseL.y} L ${tip.x} ${tip.y} L ${baseRPt.x} ${baseRPt.y} Z`}
        fill={tipColor}
      />
      <Circle cx={cx} cy={cy} r={hubR} fill={hubFill} stroke={hubStroke} strokeWidth={2} />
    </>
  );
}

type RangeRowProps = {
  minLabel: string;
  maxLabel: string;
  caption: string;
  minHint?: string;
  maxHint?: string;
};

/** In-flow min / max / window — safe inside overflow-hidden panels. */
export function GaugeRangeRow({ minLabel, maxLabel, caption, minHint, maxHint }: RangeRowProps) {
  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ alignItems: 'flex-start' }}>
          <AppText variant="mono" color={colors.textMuted} style={{ fontSize: 10, letterSpacing: 0.2 }}>
            {minLabel}
          </AppText>
          {minHint ? (
            <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 9, lineHeight: 12 }}>
              {minHint}
            </AppText>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="mono" color={colors.textSecondary} style={{ fontSize: 10, letterSpacing: 0.2 }}>
            {maxLabel}
          </AppText>
          {maxHint ? (
            <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 9, lineHeight: 12 }}>
              {maxHint}
            </AppText>
          ) : null}
        </View>
      </View>
      <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 10, textAlign: 'center', lineHeight: 13 }}>
        {caption}
      </AppText>
    </View>
  );
}
