import { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import { colors, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/app-text';

const PAD = { top: 8, right: 8, bottom: 28, left: 8 };

type LineChartProps = {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  showDots?: boolean;
};

export function LineChart({
  values,
  labels,
  height = 160,
  color = colors.lime,
  showDots = true,
}: LineChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const width = screenWidth - spacing.lg * 2 - spacing.lg * 2;

  const { points, dots } = useMemo(() => {
    if (values.length === 0) return { points: '', dots: [] as { x: number; y: number }[] };
    const max = Math.max(...values, 0.0001);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 0.0001);
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;

    const dotList = values.map((v, i) => {
      const x = PAD.left + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
      const y = PAD.top + innerH - ((v - min) / range) * innerH;
      return { x, y };
    });

    return {
      points: dotList.map((d) => `${d.x},${d.y}`).join(' '),
      dots: dotList,
    };
  }, [values, width, height]);

  if (values.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center' }}>
        <AppText variant="caption">No data for this range</AppText>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Svg width={width} height={height}>
        <Line
          x1={PAD.left}
          y1={height - PAD.bottom}
          x2={width - PAD.right}
          y2={height - PAD.bottom}
          stroke={colors.border}
          strokeWidth={1}
        />
        {values.length >= 2 ? (
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {showDots
          ? dots.map((d, i) => (
              <Circle key={i} cx={d.x} cy={d.y} r={4} fill={color} />
            ))
          : null}
      </Svg>
      {labels && labels.length >= 2 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PAD.left }}>
          <AppText variant="caption">{labels[0]}</AppText>
          <AppText variant="caption">{labels[labels.length - 1]}</AppText>
        </View>
      ) : null}
    </View>
  );
}

type StackedBarChartProps = {
  buckets: string[];
  series: { key: string; color: string; values: number[] }[];
  height?: number;
  bucketLabels?: string[];
};

export function StackedBarChart({
  buckets,
  series,
  height = 180,
  bucketLabels,
}: StackedBarChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const width = screenWidth - spacing.lg * 2 - spacing.lg * 2;
  const count = buckets.length;

  if (count === 0 || series.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center' }}>
        <AppText variant="caption">No data for this range</AppText>
      </View>
    );
  }

  const totals = buckets.map((_, i) => series.reduce((s, ser) => s + ser.values[i], 0));
  const max = Math.max(...totals, 0.0001);
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const gap = count > 14 ? 1 : 4;
  const barW = Math.max(4, (innerW - gap * (count - 1)) / count);

  return (
    <View style={{ gap: spacing.sm }}>
      <Svg width={width} height={height}>
        <Line
          x1={PAD.left}
          y1={height - PAD.bottom}
          x2={width - PAD.right}
          y2={height - PAD.bottom}
          stroke={colors.border}
          strokeWidth={1}
        />
        {buckets.map((_, i) => {
          const x = PAD.left + i * (barW + gap);
          let yBottom = height - PAD.bottom;
          return series.map((ser) => {
            const v = ser.values[i];
            if (v <= 0) return null;
            const h = (v / max) * innerH;
            yBottom -= h;
            return (
              <Rect
                key={`${ser.key}-${i}`}
                x={x}
                y={yBottom}
                width={barW}
                height={h}
                fill={ser.color}
                rx={1}
              />
            );
          });
        })}
      </Svg>
      {bucketLabels && bucketLabels.length >= 2 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PAD.left }}>
          <AppText variant="caption">{bucketLabels[0]}</AppText>
          <AppText variant="caption">{bucketLabels[bucketLabels.length - 1]}</AppText>
        </View>
      ) : null}
    </View>
  );
}

type HorizontalBarProps = {
  rows: { label: string; value: number; share: number; color: string }[];
  formatValue: (n: number) => string;
  maxRows?: number;
  /** Tighter rows for Explore breakdown */
  compact?: boolean;
};

export function HorizontalBarChart({
  rows,
  formatValue,
  maxRows = 8,
  compact,
}: HorizontalBarProps) {
  const shown = rows.slice(0, maxRows);
  const max = Math.max(...shown.map((r) => r.value), 0.0001);

  return (
    <View style={{ gap: compact ? spacing.sm : spacing.md }}>
      {shown.map((row) => (
        <View key={row.label} style={{ gap: compact ? 3 : 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'baseline' }}>
            <AppText
              variant="body"
              numberOfLines={1}
              style={{ flex: 1, color: colors.text, fontSize: compact ? 13 : 15, lineHeight: compact ? 18 : 22 }}
            >
              {row.label}
            </AppText>
            <AppText variant="caption" style={{ fontSize: 11 }}>
              {(row.share * 100).toFixed(0)}%
            </AppText>
            <AppText variant="mono" selectable style={{ fontSize: 13, color: colors.limeSoft }}>
              {formatValue(row.value)}
            </AppText>
          </View>
          <View
            style={{
              height: compact ? 5 : 8,
              borderRadius: 999,
              backgroundColor: colors.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.max((row.value / max) * 100, 2)}%`,
                height: '100%',
                backgroundColor: row.color,
                borderCurve: 'continuous',
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

type DonutSlice = { value: number; color: string };

type DonutProps = {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
};

export function Donut({ slices, size = 120, strokeWidth = 16 }: DonutProps) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total <= 0) return <View style={{ width: size, height: size }} />;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={colors.border}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {slices.map((slice, index) => {
        const length = (slice.value / total) * circumference;
        const dashoffset = -offset;
        offset += length;
        return (
          <Circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={slice.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
    </Svg>
  );
}

export function Sparkline({
  values,
  width = 160,
  height = 48,
  color = colors.lime,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) return <View style={{ width, height }} />;

  const max = Math.max(...values, 0.0001);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 0.0001);
  const pad = 2;

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
