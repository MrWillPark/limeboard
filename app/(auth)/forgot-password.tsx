import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useSession } from '@/providers/session-provider';

export default function ForgotPasswordScreen() {
  const { resetPasswordForEmail } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await resetPasswordForEmail(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send reset email');
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
        <AppText variant="title">Reset password</AppText>
        <AppText>
          We&apos;ll email a link that opens LimeBoard so you can choose a new password.
        </AppText>
      </View>

      <Panel style={{ gap: spacing.md }}>
        {sent ? (
          <>
            <AppText color={colors.limeSoft}>
              Check your inbox for a reset link. It may take a minute to arrive.
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Open the link on this device. If you signed up with Google, use Continue with Google
              instead — email passwords are only for accounts created with email.
            </AppText>
            <AppButton title="Back to sign in" onPress={() => router.replace('/(auth)/sign-in' as Href)} />
          </>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <AppText variant="label">Email</AppText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@company.com"
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
              title={loading ? 'Sending…' : 'Send reset link'}
              disabled={loading || !email.trim()}
              onPress={() => void onSubmit()}
            />
          </>
        )}
      </Panel>

      <AppButton title="Back" variant="ghost" onPress={() => router.back()} />
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
