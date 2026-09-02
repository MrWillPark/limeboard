import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useSession } from '@/providers/session-provider';

export default function ResetPasswordScreen() {
  const { updatePassword } = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title">Choose a new password</AppText>
        <AppText>This secures email sign-in for your Burnline account.</AppText>
      </View>

      <Panel style={{ gap: spacing.md }}>
        <View style={{ gap: 6 }}>
          <AppText variant="label">New password</AppText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
          />
        </View>

        <View style={{ gap: 6 }}>
          <AppText variant="label">Confirm password</AppText>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            textContentType="newPassword"
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
          />
        </View>

        {error ? (
          <AppText color={colors.red} selectable>
            {error}
          </AppText>
        ) : null}

        <AppButton
          title={loading ? 'Saving…' : 'Save password'}
          disabled={loading || password.length < 6 || !confirm}
          onPress={() => void onSubmit()}
        />
      </Panel>
    </ScrollView>
  );
}

const inputStyle = {
  fontFamily: fonts.mono,
  fontSize: 15,
  color: colors.text,
  backgroundColor: colors.bgElevated,
  borderWidth: 1,
  borderColor: colors.borderStrong,
  borderRadius: radii.md,
  borderCurve: 'continuous' as const,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  minHeight: 48,
};
