import { HStack, Spacer, Text, VStack, ZStack, Rectangle } from '@expo/ui/swift-ui';
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
  /** Normalized 0–1 values for a compact history strip (newest last). */
  history: number[];
};

const DeskMonitorWidget = (props: DeskMonitorWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const LIME = '#39FF14';
  const LIME_SOFT = '#A3E635';
  const TEXT = '#F2F7F4';
  const MUTED = '#9AADA3';
  const BG = '#0B0E0D';
  const PANEL = '#141917';
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

  const historyValues = props.history ?? [];
  const historyMax =
    historyValues.length > 0 ? Math.max(...historyValues, 0.01) : 0.01;
  const historyBars = historyValues.slice(-Math.min(historyValues.length, 24));
  const historyHeight = isLarge ? 36 : 24;
  const metricLabelSize = isLarge ? 10 : 9;
  const metricValueSize = isLarge ? 15 : 13;

  if (!props.connected) {
    return (
      <ZStack
        alignment="center"
        modifiers={[
          containerBackground(isFullColor ? BG : 'widget', 'widget'),
          clipShape('containerRelativeShape'),
        ]}
      >
        <VStack
          alignment="leading"
          spacing={6}
          modifiers={[
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' }),
            padding({ all: 14 }),
          ]}
        >
          <Text modifiers={[font({ weight: 'bold', size: 12 }), foregroundStyle(soft)]}>
            Desk Monitor
          </Text>
          <Spacer />
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

  return (
    <ZStack
      alignment="leading"
      modifiers={[
        containerBackground(isFullColor ? BG : 'widget', 'widget'),
        clipShape('containerRelativeShape'),
      ]}
    >
      {isFullColor ? (
        <Rectangle
          modifiers={[
            foregroundStyle({
              type: 'linearGradient',
              colors: [BG, PANEL],
              startPoint: { x: 0.5, y: 0 },
              endPoint: { x: 0.5, y: 1 },
            }),
            frame({ maxWidth: Infinity, maxHeight: Infinity }),
          ]}
        />
      ) : null}

      <VStack
        alignment="leading"
        spacing={isSmall ? 4 : 8}
        modifiers={[
          frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' }),
          padding({ all: isSmall ? 12 : 14 }),
        ]}
      >
        <HStack spacing={8}>
          <Text modifiers={[font({ weight: 'bold', size: 11 }), foregroundStyle(soft)]}>
            Desk Monitor
          </Text>
          <Spacer />
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
          <Text modifiers={[font({ weight: 'medium', size: isSmall ? 12 : 14 }), foregroundStyle(MUTED)]}>
            {props.rateUnit}
          </Text>
        </HStack>

        {isSmall ? (
          <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>
            Peak · {props.peakLabel}
          </Text>
        ) : (
          <HStack spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
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

        {!isSmall && historyBars.length >= 2 ? (
          <VStack alignment="leading" spacing={4}>
            <Text modifiers={[font({ size: 9 }), foregroundStyle(MUTED)]}>
              Last 30m
            </Text>
            <HStack spacing={2} alignment="bottom">
              {historyBars.map((v) => {
                const ratio = v / historyMax;
                const barH = Math.max(3, Math.round(ratio * historyHeight));
                return (
                  <Rectangle
                    modifiers={[
                      frame({ width: 4, height: barH }),
                      foregroundStyle(ratio > 0.7 ? LIME_SOFT : CHART),
                    ]}
                  />
                );
              })}
            </HStack>
          </VStack>
        ) : null}

        <Spacer />

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
