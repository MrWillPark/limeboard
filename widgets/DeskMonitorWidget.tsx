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

const LIME = '#39FF14';
const LIME_SOFT = '#A3E635';
const TEXT = '#F2F7F4';
const MUTED = '#9AADA3';
const BG = '#0B0E0D';
const PANEL = '#141917';
const CHART = '#6B8F78';

function Metric({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <VStack alignment="leading" spacing={2}>
      <Text
        modifiers={[
          font({ weight: 'medium', size: compact ? 9 : 10 }),
          foregroundStyle(MUTED),
        ]}
      >
        {label}
      </Text>
      <Text
        modifiers={[
          font({ weight: 'semibold', size: compact ? 13 : 15, design: 'monospaced' }),
          foregroundStyle(TEXT),
        ]}
      >
        {value}
      </Text>
    </VStack>
  );
}

function HistoryStrip({ values, height }: { values: number[]; height: number }) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 0.01);
  const barCount = Math.min(values.length, 24);

  return (
    <HStack spacing={2} alignment="bottom">
      {values.slice(-barCount).map((v, i) => {
        const ratio = v / max;
        const barH = Math.max(3, Math.round(ratio * height));
        return (
          <Rectangle
            key={i}
            modifiers={[
              frame({ width: 4, height: barH }),
              foregroundStyle(ratio > 0.7 ? LIME_SOFT : CHART),
            ]}
          />
        );
      })}
    </HStack>
  );
}

const DeskMonitorWidget = (props: DeskMonitorWidgetProps, environment: WidgetEnvironment) => {
  'widget';

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
            <Metric label="Peak" value={props.peakLabel} compact={!isLarge} />
            <Metric label="Avg · 30m" value={props.avgLabel} compact={!isLarge} />
          </HStack>
        )}

        {!isSmall && props.history.length >= 2 ? (
          <VStack alignment="leading" spacing={4}>
            <Text modifiers={[font({ size: 9 }), foregroundStyle(MUTED)]}>
              Last 30m
            </Text>
            <HistoryStrip values={props.history} height={isLarge ? 36 : 24} />
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
