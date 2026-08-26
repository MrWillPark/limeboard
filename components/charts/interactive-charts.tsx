import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  PanResponder,
  View,
  type LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';

const PAD = { top: 12, right: 8, bottom: 28, left: 8 };

type ScrubProps = {
  index: number | null;
  onIndexChange: (index: number | null) => void;
  count: number;
  height?: number;
  children: (layout: {
    width: number;
    height: number;
    index: number | null;
  }) => ReactNode;
};

function ScrubSurface({ index, onIndexChange, count, height = 160, children }: ScrubProps) {
  const { width: screenWidth } = useWindowDimensions();
  const width = screenWidth - spacing.lg * 2 - spacing.lg * 2;
  const layoutRef = useRef({ width, height });

  const indexFromX = useCallback(
    (x: number) => {
      if (count <= 0) return null;
      const innerW = layoutRef.current.width - PAD.left - PAD.right;
      const clamped = Math.max(PAD.left, Math.min(x, layoutRef.current.width - PAD.right));
      const ratio = innerW <= 0 ? 0 : (clamped - PAD.left) / innerW;
      if (count === 1) return 0;
      return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
    },
    [count]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => count > 0,
        onMoveShouldSetPanResponder: () => count > 0,
        onPanResponderGrant: (evt) => onIndexChange(indexFromX(evt.nativeEvent.locationX)),
        onPanResponderMove: (evt) => onIndexChange(indexFromX(evt.nativeEvent.locationX)),
        onPanResponderRelease: () => {},
        onPanResponderTerminate: () => {},
      }),
    [count, indexFromX, onIndexChange]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    layoutRef.current = {
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    };
  };

  return (
    <View
      onLayout={onLayout}
      {...panResponder.panHandlers}
      style={{ width, height, position: 'relative' }}
    >
      {children({ width, height, index })}
    </View>
  );
}

type InteractiveLineProps = {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  selectedIndex: number | null;
  onSelectIndex: (index: number | null) => void;
};

export function InteractiveLineChart({
  values,
  labels,
  height = 160,
  color = colors.chartLine,
  selectedIndex,
  onSelectIndex,
}: InteractiveLineProps) {
  if (values.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center' }}>
        <AppText variant="caption">No data for this range</AppText>
      </View>
    );
  }

  const max = Math.max(...values, 0.0001);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 0.0001);

  return (
    <ScrubSurface
      index={selectedIndex}
      onIndexChange={onSelectIndex}
      count={values.length}
      height={height}
    >
      {({ width, height: h, index }) => {
        const innerW = width - PAD.left - PAD.right;
        const innerH = h - PAD.top - PAD.bottom;
        const dots = values.map((v, i) => {
          const x =
            PAD.left + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
          const y = PAD.top + innerH - ((v - min) / range) * innerH;
          return { x, y };
        });
        const points = dots.map((d) => `${d.x},${d.y}`).join(' ');
        const sel = index != null ? dots[index] : null;

        return (
          <>
            <Svg width={width} height={h}>
              <Line
                x1={PAD.left}
                y1={h - PAD.bottom}
                x2={width - PAD.right}
                y2={h - PAD.bottom}
                stroke={colors.border}
                strokeWidth={1}
              />
              {sel ? (
                <Line
                  x1={sel.x}
                  y1={PAD.top}
                  x2={sel.x}
                  y2={h - PAD.bottom}
                  stroke={colors.limeGlow}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              ) : null}
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
              {dots.map((d, i) => (
                <Circle
                  key={i}
                  cx={d.x}
                  cy={d.y}
                  r={index === i ? 6 : 3.5}
                  fill={index === i ? colors.text : color}
                  stroke={index === i ? colors.chartSelect : 'none'}
                  strokeWidth={index === i ? 2 : 0}
                />
              ))}
            </Svg>
            {labels && labels.length > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  left: PAD.left,
                  right: PAD.right,
                  bottom: 0,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <AppText variant="caption">{labels[0]}</AppText>
                {labels.length > 1 ? (
                  <AppText variant="caption">{labels[labels.length - 1]}</AppText>
                ) : null}
              </View>
            ) : null}
          </>
        );
      }}
    </ScrubSurface>
  );
}

type InteractiveStackedProps = {
  buckets: string[];
  series: { key: string; color: string; values: number[] }[];
  height?: number;
  bucketLabels?: string[];
  selectedIndex: number | null;
  onSelectIndex: (index: number | null) => void;
};

export function InteractiveStackedBarChart({
  buckets,
  series,
  height = 180,
  bucketLabels,
  selectedIndex,
  onSelectIndex,
}: InteractiveStackedProps) {
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

  return (
    <ScrubSurface
      index={selectedIndex}
      onIndexChange={onSelectIndex}
      count={count}
      height={height}
    >
      {({ width, height: h, index }) => {
        const innerW = width - PAD.left - PAD.right;
        const innerH = h - PAD.top - PAD.bottom;
        const gap = count > 40 ? 1 : count > 14 ? 2 : 4;
        const barW = Math.max(2, (innerW - gap * Math.max(count - 1, 0)) / count);
        const selX =
          index != null
            ? PAD.left + index * (barW + gap) + barW / 2
            : null;

        return (
          <>
            <Svg width={width} height={h}>
              <Line
                x1={PAD.left}
                y1={h - PAD.bottom}
                x2={width - PAD.right}
                y2={h - PAD.bottom}
                stroke={colors.border}
                strokeWidth={1}
              />
              {selX != null ? (
                <Line
                  x1={selX}
                  y1={PAD.top}
                  x2={selX}
                  y2={h - PAD.bottom}
                  stroke={colors.limeGlow}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              ) : null}
              {buckets.map((_, i) => {
                const x = PAD.left + i * (barW + gap);
                const selected = index === i;
                let yBottom = h - PAD.bottom;
                return series.map((ser) => {
                  const v = ser.values[i];
                  if (v <= 0) return null;
                  const barH = (v / max) * innerH;
                  yBottom -= barH;
                  return (
                    <Rect
                      key={`${ser.key}-${i}`}
                      x={x}
                      y={yBottom}
                      width={barW}
                      height={barH}
                      fill={ser.color}
                      opacity={index == null || selected ? 1 : 0.35}
                      rx={1}
                    />
                  );
                });
              })}
            </Svg>
            {bucketLabels && bucketLabels.length >= 2 ? (
              <View
                style={{
                  position: 'absolute',
                  left: PAD.left,
                  right: PAD.right,
                  bottom: 0,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <AppText variant="caption">{bucketLabels[0]}</AppText>
                <AppText variant="caption">{bucketLabels[bucketLabels.length - 1]}</AppText>
              </View>
            ) : null}
          </>
        );
      }}
    </ScrubSurface>
  );
}
