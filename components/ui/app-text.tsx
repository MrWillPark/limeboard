import { PropsWithChildren } from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

import { colors, fonts } from '@/constants/theme';

type Variant = 'display' | 'title' | 'body' | 'caption' | 'mono' | 'monoLg' | 'label';

const styles: Record<Variant, TextStyle> = {
  display: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    letterSpacing: -0.6,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.sansSemi,
    fontSize: 18,
    letterSpacing: -0.2,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    color: colors.text,
  },
  monoLg: {
    fontFamily: fonts.monoBold,
    fontSize: 32,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    color: colors.lime,
  },
};

type Props = TextProps & {
  variant?: Variant;
  color?: string;
};

export function AppText({ variant = 'body', color, style, children, ...rest }: Props) {
  return (
    <Text
      style={[styles[variant], color ? { color } : null, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function ScreenTitle({ children }: PropsWithChildren) {
  return <AppText variant="display">{children}</AppText>;
}
