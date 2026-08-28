import { HStack, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type BalanceWidgetProps = {
  connected: boolean;
  balanceLabel: string;
  spendLabel: string;
  spendCaption: string;
  runwayLabel: string;
  avgDailyLabel: string;
};

const BalanceWidget = (props: BalanceWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const LIME = '#39FF14';
  const LIME_SOFT = '#A3E635';
  const TEXT = '#F2F7F4';
  const MUTED = '#9AADA3';
  const BG = '#0B0E0D';

  const isFullColor =
    environment.widgetRenderingMode == null ||
    environment.widgetRenderingMode === 'fullColor';
  const isSmall = environment.widgetFamily === 'systemSmall';
  const isLarge =
    environment.widgetFamily === 'systemLarge' ||
    environment.widgetFamily === 'systemExtraLarge';

  const accent = isFullColor ? LIME : TEXT;
  const soft = isFullColor ? LIME_SOFT : MUTED;
  const shell = [
    containerBackground(isFullColor ? BG : 'widget', 'widget'),
    clipShape('containerRelativeShape'),
  ];
  const pad = padding({ all: isSmall ? 12 : 14 });

  if (!props.connected) {
    return (
      <ZStack alignment="center" modifiers={shell}>
        <VStack alignment="leading" spacing={6} modifiers={[pad]}>
          <Text modifiers={[font({ weight: 'bold', size: 12 }), foregroundStyle(soft)]}>
            LimeBoard
          </Text>
          <Text modifiers={[font({ weight: 'semibold', size: 15 }), foregroundStyle(TEXT)]}>
            Connect a key
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>
            Open the app to show balance and burn.
          </Text>
        </VStack>
      </ZStack>
    );
  }

  return (
    <ZStack alignment="leading" modifiers={shell}>
      <VStack alignment="leading" spacing={isSmall ? 6 : 8} modifiers={[pad]}>
        <HStack spacing={8}>
          <Text modifiers={[font({ weight: 'bold', size: 11 }), foregroundStyle(soft)]}>
            LimeBoard
          </Text>
          {!isSmall ? (
            <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>
              {props.spendCaption}
            </Text>
          ) : null}
        </HStack>

        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ weight: 'medium', size: 10 }), foregroundStyle(MUTED)]}>
            Balance
          </Text>
          <Text
            modifiers={[
              font({
                weight: 'bold',
                size: isSmall ? 22 : isLarge ? 34 : 28,
                design: 'monospaced',
              }),
              foregroundStyle(accent),
            ]}
          >
            {props.balanceLabel}
          </Text>
        </VStack>

        {isSmall ? (
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>
              {props.spendCaption}
            </Text>
            <Text
              modifiers={[
                font({ weight: 'semibold', size: 14, design: 'monospaced' }),
                foregroundStyle(TEXT),
              ]}
            >
              {props.spendLabel}
            </Text>
            <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTED)]}>
              Runway · {props.runwayLabel}
            </Text>
          </VStack>
        ) : (
          <HStack spacing={12}>
            <VStack alignment="leading" spacing={2}>
              <Text
                modifiers={[font({ weight: 'medium', size: 10 }), foregroundStyle(MUTED)]}
              >
                {props.spendCaption}
              </Text>
              <Text
                modifiers={[
                  font({ weight: 'semibold', size: 15, design: 'monospaced' }),
                  foregroundStyle(TEXT),
                ]}
              >
                {props.spendLabel}
              </Text>
            </VStack>
            <VStack alignment="leading" spacing={2}>
              <Text
                modifiers={[font({ weight: 'medium', size: 10 }), foregroundStyle(MUTED)]}
              >
                Avg / day
              </Text>
              <Text
                modifiers={[
                  font({ weight: 'semibold', size: 15, design: 'monospaced' }),
                  foregroundStyle(TEXT),
                ]}
              >
                {props.avgDailyLabel}
              </Text>
            </VStack>
            <VStack alignment="leading" spacing={2}>
              <Text
                modifiers={[font({ weight: 'medium', size: 10 }), foregroundStyle(MUTED)]}
              >
                Runway
              </Text>
              <Text
                modifiers={[
                  font({ weight: 'semibold', size: 15, design: 'monospaced' }),
                  foregroundStyle(TEXT),
                ]}
              >
                {props.runwayLabel}
              </Text>
            </VStack>
          </HStack>
        )}

        {isLarge ? (
          <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>
            OpenRouter credits · updates when you open LimeBoard
          </Text>
        ) : null}
      </VStack>
    </ZStack>
  );
};

export default createWidget('BalanceWidget', BalanceWidget);
