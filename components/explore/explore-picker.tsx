import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/constants/theme';

export type ExplorePickerOption = { id: string; label: string };

type Props = {
  label: string;
  options: ExplorePickerOption[];
  value: string;
  onChange: (id: string) => void;
  /** Stretch to fill grid cell */
  flex?: boolean;
};

export function ExplorePicker({ label, options, value, onChange, flex }: Props) {
  const [open, setOpen] = useState(false);
  const { height: screenHeight } = useWindowDimensions();
  const selected = options.find((o) => o.id === value);

  const select = (id: string) => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }
    onChange(id);
    setOpen(false);
  };

  return (
    <View style={{ flex: flex ? 1 : undefined, minWidth: 0, gap: 4 }}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.sm,
          paddingVertical: 10,
          borderRadius: radii.sm,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: colors.bgElevated,
          minHeight: 40,
        }}
      >
        <AppText
          numberOfLines={1}
          style={{ flex: 1, fontSize: 13, color: colors.text }}
        >
          {selected?.label ?? 'Select'}
        </AppText>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.panel,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              borderCurve: 'continuous',
              borderTopWidth: 1,
              borderColor: colors.borderStrong,
              paddingTop: spacing.md,
              paddingBottom: spacing.xl,
              maxHeight: screenHeight * 0.55,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.lg,
                marginBottom: spacing.sm,
              }}
            >
              <AppText variant="title">{label}</AppText>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              bounces={false}
              contentContainerStyle={{ paddingHorizontal: spacing.md }}
            >
              {options.map((opt) => {
                const active = opt.id === value;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => select(opt.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.sm,
                      borderRadius: radii.sm,
                      borderCurve: 'continuous',
                      backgroundColor: active ? colors.limeDim : 'transparent',
                    }}
                  >
                    <AppText
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: active ? colors.lime : colors.text,
                      }}
                    >
                      {opt.label}
                    </AppText>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.lime} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
