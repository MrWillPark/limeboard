import { ScrollView } from 'react-native';
import { router } from 'expo-router';

import { ConnectKeyCard } from '@/components/cockpit/connect-key-card';
import { colors, spacing } from '@/constants/theme';

export default function ConnectModal() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg }}
      keyboardShouldPersistTaps="handled"
    >
      <ConnectKeyCard
        onSuccess={() => {
          if (router.canGoBack()) router.back();
        }}
      />
    </ScrollView>
  );
}
