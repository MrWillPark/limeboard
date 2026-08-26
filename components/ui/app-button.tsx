import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/app-text';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: Props) {
  const bg =
    variant === 'primary'
      ? colors.lime
      : variant === 'danger'
        ? colors.redDim
        : 'transparent';
  const color =
    variant === 'primary'
      ? colors.textInverse
      : variant === 'danger'
        ? colors.red
        : colors.limeSoft;
  const border =
    variant === 'ghost'
      ? colors.borderStrong
      : variant === 'danger'
        ? colors.red
        : 'transparent';

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <AppText
        style={{
          fontFamily: fonts.sansSemi,
          fontSize: 15,
          color,
        }}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
