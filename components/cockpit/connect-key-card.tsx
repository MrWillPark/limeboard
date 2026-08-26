import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

type Props = {
  onSuccess?: () => void;
};

export function ConnectKeyCard({ onSuccess }: Props) {
  const { connect } = useAuth();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      await connect(value);
      setValue('');
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not validate key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel style={{ gap: spacing.md }}>
      <View style={{ gap: 6 }}>
        <AppText variant="title">Connect OpenRouter</AppText>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 15,
            lineHeight: 22,
            color: colors.textSecondary,
          }}
        >
          Paste a read-friendly API key. Prefer a{' '}
          <Text style={{ color: colors.limeSoft, fontFamily: fonts.sansMedium }}>
            Management API key
          </Text>{' '}
          for activity history and multi-key fleet views. Keys stay in the device
          keychain — no LimeBoard server.
        </Text>
      </View>

      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="sk-or-v1-…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={{
          minHeight: 48,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          borderRadius: radii.md,
          borderCurve: 'continuous',
          paddingHorizontal: spacing.md,
          color: colors.text,
          fontFamily: fonts.mono,
          fontSize: 13,
          backgroundColor: colors.bgElevated,
        }}
      />

      {error ? (
        <AppText selectable color={colors.red}>
          {error}
        </AppText>
      ) : null}

      <AppButton
        title={loading ? 'Validating…' : 'Save key'}
        onPress={onConnect}
        disabled={loading || value.trim().length < 12}
      />
      {loading ? <ActivityIndicator color={colors.lime} /> : null}
    </Panel>
  );
}
