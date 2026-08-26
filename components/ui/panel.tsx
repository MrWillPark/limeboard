import { PropsWithChildren } from 'react';
import { View, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type Props = PropsWithChildren<{
  style?: ViewStyle;
  accent?: boolean;
  padded?: boolean;
}>;

export function Panel({ children, style, accent, padded = true }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.panel,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: accent ? colors.limeGlow : colors.border,
          overflow: 'hidden',
        },
        padded ? { padding: spacing.lg } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
