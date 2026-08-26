import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export default function SettingsScreen() {
  const { isConnected, maskedKey, meta, disconnect } = useAuth();

  const onDisconnect = () => {
    Alert.alert('Remove API key?', 'The key will be deleted from the device keychain.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void disconnect();
        },
      },
    ]);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 }}
    >
      <Panel style={{ gap: spacing.md }}>
        <AppText variant="title">Account</AppText>
        {isConnected ? (
          <>
            <View style={{ gap: 4 }}>
              <AppText variant="label">Stored key</AppText>
              <AppText variant="mono" selectable>
                {maskedKey}
              </AppText>
              <AppText variant="caption">
                Saved {meta?.savedAt ? new Date(meta.savedAt).toLocaleString() : '—'}
                {meta?.isManagementKey ? ' · management' : ' · standard'}
              </AppText>
            </View>
            <AppButton title="Replace key" variant="ghost" onPress={() => router.push('/connect')} />
            <AppButton title="Disconnect" variant="danger" onPress={onDisconnect} />
          </>
        ) : (
          <>
            <AppText>No key on device.</AppText>
            <AppButton
              title="Connect OpenRouter"
              onPress={() => router.push('/connect')}
            />
          </>
        )}
      </Panel>

      <Panel style={{ gap: spacing.sm }}>
        <AppText variant="title">About LimeBoard</AppText>
        <AppText>
          Mobile OpenRouter usage analytics with a path toward infrastructure
          burn tracking. V1 is local-only: your key never leaves the device
          except for direct calls to OpenRouter.
        </AppText>
        <AppText variant="caption">Palette · Electric lime #39FF14 on #0B0E0D</AppText>
      </Panel>

      <Panel style={{ gap: spacing.sm }}>
        <AppText variant="title">Roadmap</AppText>
        <AppText variant="caption">• Anomaly / velocity push alerts</AppText>
        <AppText variant="caption">• Model cost arbitrage suggestions</AppText>
        <AppText variant="caption">• Widgets & Live Activities</AppText>
        <AppText variant="caption">• Startup infra burn (stretch)</AppText>
      </Panel>
    </ScrollView>
  );
}
