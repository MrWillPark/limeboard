import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import Purchases from 'react-native-purchases';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { deleteLimeBoardAccount } from '@/lib/auth/delete-account';
import { LEGAL } from '@/lib/config/legal';
import { isRevenueCatConfigured } from '@/lib/config/env';
import { useOpenRouter } from '@/providers/openrouter-provider';
import { useSession } from '@/providers/session-provider';
import { useSubscription } from '@/providers/subscription-provider';

export default function SettingsScreen() {
  const { user, signOut } = useSession();
  const { isConnected, maskedKey, meta, isAdminKey, disconnect } = useOpenRouter();
  const { isPro, showManageSubscriptions } = useSubscription();
  const proUnlocked = isPro || isAdminKey;
  const [deleting, setDeleting] = useState(false);

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

  const signOutAccount = useCallback(async () => {
    if (isRevenueCatConfigured()) {
      try {
        await Purchases.logOut();
      } catch {
        // ignore — user may not have RC identity
      }
    }
    await signOut();
  }, [signOut]);

  const onSignOut = () => {
    Alert.alert('Sign out?', 'Your OpenRouter key stays on this device until removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOutAccount();
        },
      },
    ]);
  };

  const onDeleteAccount = () => {
    Alert.alert(
      'Delete LimeBoard account?',
      'This permanently deletes your LimeBoard login. OpenRouter keys on this device are removed. App Store / Play subscriptions must be cancelled separately in your store settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              try {
                await deleteLimeBoardAccount();
                await disconnect().catch(() => {});
                Alert.alert('Account deleted', 'Your LimeBoard account has been removed.');
              } catch (e) {
                Alert.alert(
                  'Could not delete account',
                  e instanceof Error ? e.message : 'Try again later.'
                );
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 }}
    >
      <Panel style={{ gap: spacing.md }}>
        <AppText variant="title">LimeBoard account</AppText>
        <View style={{ gap: 4 }}>
          <AppText variant="label">Signed in as</AppText>
          <AppText variant="mono" selectable>
            {user?.email ?? user?.id ?? '—'}
          </AppText>
        </View>
        <AppButton title="Sign out" variant="ghost" onPress={onSignOut} />
        <AppButton
          title={deleting ? 'Deleting…' : 'Delete account'}
          variant="danger"
          disabled={deleting}
          onPress={onDeleteAccount}
        />
      </Panel>

      <Panel style={{ gap: spacing.md }}>
        <AppText variant="title">Subscription</AppText>
        <AppText variant="caption">
          {isAdminKey
            ? 'Admin key connected — all Pro and management features unlocked.'
            : isPro
              ? 'LimeBoard Pro is active on this account.'
              : 'Free tier — basic stats and 30-day Explore.'}
        </AppText>
        {proUnlocked && !isAdminKey ? (
          <AppButton
            title="Manage subscription"
            variant="ghost"
            onPress={() => void showManageSubscriptions()}
          />
        ) : isAdminKey ? null : (
          <AppButton title="Upgrade to Pro" onPress={() => router.push('/paywall')} />
        )}
      </Panel>

      <Panel style={{ gap: spacing.md }}>
        <AppText variant="title">OpenRouter key</AppText>
        {isConnected ? (
          <>
            <View style={{ gap: 4 }}>
              <AppText variant="label">Stored key</AppText>
              <AppText variant="mono" selectable>
                {maskedKey}
              </AppText>
              <AppText variant="caption">
                Saved {meta?.savedAt ? new Date(meta.savedAt).toLocaleString() : '—'}
                {meta?.isAdminKey
                  ? ' · admin'
                  : meta?.isManagementKey
                    ? ' · management'
                    : ' · standard'}
              </AppText>
            </View>
            <AppButton title="Replace key" variant="ghost" onPress={() => router.push('/connect')} />
            <AppButton title="Disconnect" variant="danger" onPress={onDisconnect} />
          </>
        ) : (
          <>
            <AppText>No key on device.</AppText>
            <AppButton title="Connect OpenRouter" onPress={() => router.push('/connect')} />
          </>
        )}
      </Panel>

      <Panel style={{ gap: spacing.sm }}>
        <AppText variant="title">Legal</AppText>
        <AppButton title="Privacy Policy" variant="ghost" onPress={() => router.push('/privacy')} />
        <AppButton title="Terms of Use" variant="ghost" onPress={() => router.push('/terms')} />
        <AppButton
          title="Apple Standard EULA"
          variant="ghost"
          onPress={() => void Linking.openURL(LEGAL.eulaUrl)}
        />
        <AppText
          variant="caption"
          color={colors.limeSoft}
          onPress={() => void Linking.openURL(`mailto:${LEGAL.supportEmail}`)}
        >
          {LEGAL.supportEmail}
        </AppText>
      </Panel>

      <Panel style={{ gap: spacing.sm }}>
        <AppText variant="title">About LimeBoard</AppText>
        <AppText>
          Mobile OpenRouter usage analytics. Your API key stays in the device keychain;
          platform rankings are cached via Supabase for no-key browsing.
        </AppText>
        <AppText variant="caption">Palette · Electric lime #39FF14 on #0B0E0D</AppText>
      </Panel>
    </ScrollView>
  );
}
