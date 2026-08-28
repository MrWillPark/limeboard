import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useSession } from '@/providers/session-provider';

export default function SignInScreen() {
  const { signInWithEmail, signUpWithEmail } = useSession();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'sign-in') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
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
        <AppText variant="title">{mode === 'sign-in' ? 'Sign in' : 'Create account'}</AppText>
        <AppText>Use the email tied to your LimeBoard subscription.</AppText>
        {mode === 'sign-in' ? (
          <AppText variant="caption" color={colors.textSecondary}>
            Google-only accounts: use Continue with Google on the welcome screen. Set a password via
            Forgot password if you need email sign-in.
          </AppText>
        ) : null}
      </View>

      <Panel style={{ gap: spacing.md }}>
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

        <View style={{ gap: 6 }}>
          <AppText variant="label">Password</AppText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
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
          title={mode === 'sign-in' ? 'Sign in' : 'Create account'}
          disabled={loading || !email || password.length < 6}
          onPress={() => void onSubmit()}
        />

        <AppButton
          title={
            mode === 'sign-in'
              ? 'Need an account? Sign up'
              : 'Already have an account? Sign in'
          }
          variant="ghost"
          onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        />

        {mode === 'sign-in' ? (
          <AppButton
            title="Forgot password?"
            variant="ghost"
            onPress={() => router.push('/(auth)/forgot-password' as Href)}
          />
        ) : null}
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
