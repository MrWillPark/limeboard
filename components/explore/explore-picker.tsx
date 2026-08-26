import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/constants/theme';

type Option = { id: string; label: string };

type Props = {
  label: string;
  options: Option[];
  value: string;
  onChange: (id: string) => void;
};

export function ExplorePicker({ label, options, value, onChange }: Props) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label">{label}</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}
      >
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <Pressable
              key={opt.id}
              onPress={() => {
                if (process.env.EXPO_OS === 'ios') {
                  Haptics.selectionAsync();
                }
                onChange(opt.id);
              }}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radii.pill,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: active ? colors.limeGlow : colors.borderStrong,
                backgroundColor: active ? colors.limeDim : colors.bgElevated,
              }}
            >
              <AppText
                style={{
                  fontSize: 13,
                  color: active ? colors.lime : colors.textSecondary,
                }}
              >
                {opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
