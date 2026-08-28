import { HStack, Rectangle, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type DeskMonitorWidgetProps = {
  connected: boolean;
  mode: 'tokens' | 'spend';
  rateLabel: string;
  rateUnit: string;
  peakLabel: string;
  avgLabel: string;
  updatedLabel: string;
  sourceLabel: string;
  /** Bar heights in points (3–36), newest last. Precomputed in the app. */
  historyHeights: number[];
};

const DeskMonitorWidget = (props: DeskMonitorWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const LIME = '#39FF14';
  const LIME_SOFT = '#A3E635';
  const TEXT = '#F2F7F4';
  const MUTED = '#9AADA3';
  const BG = '#0B0E0D';
  const CHART = '#6B8F78';

  const isFullColor =
    environment.widgetRenderingMode == null ||
    environment.widgetRenderingMode === 'fullColor';
  const isSmall = environment.widgetFamily === 'systemSmall';
  const isLarge =
    environment.widgetFamily === 'systemLarge' ||
    environment.widgetFamily === 'systemExtraLarge';

  const accent = isFullColor ? LIME : TEXT;
  const soft = isFullColor ? LIME_SOFT : MUTED;
  const title = props.mode === 'tokens' ? 'Token burn' : 'Spend velocity';
  const shell = [
    containerBackground(isFullColor ? BG : 'widget', 'widget'),
    clipShape('containerRelativeShape'),
  ];
  const pad = padding({ all: isSmall ? 12 : 14 });
  const metricLabelSize = isLarge ? 10 : 9;
  const metricValueSize = isLarge ? 15 : 13;

  const renderHistory = (heights: number[], hot: string, cool: string) => {
    const bars = [];
    for (let i = 0; i < heights.length; i++) {
      const barH = heights[i];
      bars.push(
        <Rectangle
          modifiers={[
            frame({ width: 4, height: barH }),
            foregroundStyle(barH > 24 ? hot : cool),
          ]}
        />
      );
    }
    return bars;
  };

  if (!props.connected) {
    return (
      <ZStack alignment="center" modifiers={shell}>
        <VStack alignment="leading" spacing={6} modifiers={[pad]}>
          <Text modifiers={[font({ weight: 'bold', size: 12 }), foregroundStyle(soft)]}>
            Desk Monitor
          </Text>
          <Text modifiers={[font({ weight: 'semibold', size: 15 }), foregroundStyle(TEXT)]}>
            Connect a key
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>
            Open LimeBoard to show live burn on your desk.
          </Text>
        </VStack>
      </ZStack>
    );
  }

  const historyHeights = props.historyHeights ?? [];

  return (
    <ZStack alignment="leading" modifiers={shell}>
      <VStack alignment="leading" spacing={isSmall ? 6 : 8} modifiers={[pad]}>
        <HStack spacing={8}>
          <Text modifiers={[font({ weight: 'bold', size: 11 }), foregroundStyle(soft)]}>
            Desk Monitor
          </Text>
          {!isSmall ? (
            <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>
              {props.updatedLabel}
            </Text>
          ) : null}
        </HStack>

        <Text modifiers={[font({ weight: 'medium', size: 10 }), foregroundStyle(MUTED)]}>
          {title}
        </Text>

        <HStack spacing={8} alignment="firstTextBaseline">
          <Text
            modifiers={[
              font({
                weight: 'bold',
                size: isSmall ? 26 : isLarge ? 40 : 32,
                design: 'monospaced',
              }),
              foregroundStyle(accent),
            ]}
          >
            {props.rateLabel}
          </Text>
          <Text
            modifiers={[
              font({ weight: 'medium', size: isSmall ? 12 : 14 }),
              foregroundStyle(MUTED),
            ]}
          >
            {props.rateUnit}
          </Text>
        </HStack>

        {isSmall ? (
          <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>
            Peak · {props.peakLabel}
          </Text>
        ) : (
          <HStack spacing={12}>
            <VStack alignment="leading" spacing={2}>
              <Text
                modifiers={[
                  font({ weight: 'medium', size: metricLabelSize }),
                  foregroundStyle(MUTED),
                ]}
              >
                Peak
              </Text>
              <Text
                modifiers={[
                  font({ weight: 'semibold', size: metricValueSize, design: 'monospaced' }),
                  foregroundStyle(TEXT),
                ]}
              >
                {props.peakLabel}
              </Text>
            </VStack>
            <VStack alignment="leading" spacing={2}>
              <Text
                modifiers={[
                  font({ weight: 'medium', size: metricLabelSize }),
                  foregroundStyle(MUTED),
                ]}
              >
                Avg · 30m
              </Text>
              <Text
                modifiers={[
                  font({ weight: 'semibold', size: metricValueSize, design: 'monospaced' }),
                  foregroundStyle(TEXT),
                ]}
              >
                {props.avgLabel}
              </Text>
            </VStack>
          </HStack>
        )}

        {!isSmall && historyHeights.length >= 2 ? (
          <VStack alignment="leading" spacing={4}>
            <Text modifiers={[font({ size: 9 }), foregroundStyle(MUTED)]}>
              Last 30m
            </Text>
            <HStack spacing={2} alignment="bottom">
              {renderHistory(historyHeights, LIME_SOFT, CHART)}
            </HStack>
          </VStack>
        ) : null}

        {isLarge ? (
          <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>
            {props.sourceLabel} · updates when you open LimeBoard
          </Text>
        ) : isSmall ? (
          <Text modifiers={[font({ size: 9 }), foregroundStyle(MUTED)]}>
            {props.updatedLabel}
          </Text>
        ) : null}
      </VStack>
    </ZStack>
  );
};

export default createWidget('DeskMonitorWidget', DeskMonitorWidget);
