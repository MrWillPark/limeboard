import { useCallback, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import Purchases from 'react-native-purchases';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { deleteLimeBoardAccount } from '@/lib/auth/delete-account';
import { LEGAL } from '@/lib/config/legal';
import { canUseRevenueCatNative, env } from '@/lib/config/env';
import { useAdminAccount } from '@/hooks/use-admin-account';
import { useOpenRouter } from '@/providers/openrouter-provider';
import {
  type ScreenshotPreviewMode,
  useScreenshotPreview,
} from '@/providers/screenshot-preview-provider';
import { useSession } from '@/providers/session-provider';
import { useSubscription } from '@/providers/subscription-provider';
const PREVIEW_MODES: { id: ScreenshotPreviewMode; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'no-key', label: 'No key' },
  { id: 'no-pro', label: 'No Pro' },
];

export default function SettingsScreen() {
  const { user, signOut } = useSession();
  const { isConnected, maskedKey, meta, realIsConnected, disconnect } = useOpenRouter();
  const { isAdminAccount, realIsAdminAccount } = useAdminAccount();
  const { isPro, showManageSubscriptions } = useSubscription();
  const { mode: previewMode, setMode: setPreviewMode } = useScreenshotPreview();
  const proUnlocked = isPro || isAdminAccount;
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
    if (canUseRevenueCatNative()) {
      try {
        await Purchases.logOut();
      } catch {
        // ignore — user may not have RC identity
      }
    }
    await signOut();
  }, [signOut]);

  const onSignOut = () => {
    Alert.alert(
      'Sign out?',
      'Your OpenRouter key stays saved for this account on this device. Other accounts will not see it.',
      [
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
      'Delete Burnline account?',
      'This permanently deletes your Burnline login. API keys on this device are removed. App Store / Play subscriptions must be cancelled separately in your store settings.',
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
                Alert.alert('Account deleted', 'Your Burnline account has been removed.');
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
      {__DEV__ ? (
        <Panel
          style={{
            gap: spacing.sm,
            borderColor: previewMode !== 'live' ? colors.amber : colors.borderStrong,
            backgroundColor: previewMode !== 'live' ? colors.amberDim : colors.panel,
          }}
        >
          <AppText variant="title" style={{ fontSize: 15 }}>
            Dev · access status
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Preview: {previewMode} · Key: {realIsConnected ? 'connected' : 'missing'} · Admin
            account: {realIsAdminAccount ? 'yes' : 'no'} · DEV_PRO: {env.devPro ? 'on' : 'off'}
          </AppText>
          {previewMode !== 'live' ? (
            <AppButton title="Exit preview → Live" onPress={() => setPreviewMode('live')} />
          ) : null}
          {!realIsConnected ? (
            <AppButton title="Connect OpenRouter key" onPress={() => router.push('/connect')} />
          ) : null}
        </Panel>
      ) : null}

      <Panel style={{ gap: spacing.md }}>
        <AppText variant="title">Burnline account</AppText>
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
          {realIsAdminAccount
            ? 'Owner account — all Pro and management features unlocked.'
            : isPro
              ? 'Burnline Pro is active on this account.'
              : 'Free tier — basic stats and 30-day Explore.'}
        </AppText>
        {proUnlocked && !realIsAdminAccount ? (
          <AppButton
            title="Manage subscription"
            variant="ghost"
            onPress={() => void showManageSubscriptions()}
          />
        ) : realIsAdminAccount ? null : (
          <AppButton title="Upgrade to Pro" onPress={() => router.push('/paywall')} />
        )}
      </Panel>

      {realIsAdminAccount ? (
        <Panel
          style={{
            gap: spacing.md,
            borderColor: colors.amber,
            backgroundColor: colors.amberDim,
          }}
        >
          <AppText variant="title" color={colors.amber}>
            Screenshot preview
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Fake no-key / no-Pro UI for App Store shots. Your real key stays connected — switch
            back to Live when done.
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {PREVIEW_MODES.map(({ id, label }) => {
              const active = previewMode === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setPreviewMode(id)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.sm,
                    borderRadius: 10,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: active ? colors.amber : colors.borderStrong,
                    backgroundColor: active ? 'rgba(245, 158, 11, 0.2)' : colors.panel,
                    alignItems: 'center',
                  }}
                >
                  <AppText
                    variant="label"
                    color={active ? colors.amber : colors.textSecondary}
                    style={{ fontSize: 11 }}
                  >
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </Panel>
      ) : null}

      <Panel style={{ gap: spacing.md }}>
        <AppText variant="title">Desk Monitor</AppText>
        <AppText variant="caption">
          Full-screen live burn view for a second monitor, plus an iOS/iPad widget for your desk setup.
        </AppText>
        <AppButton title="Open Desk Monitor" variant="ghost" onPress={() => router.push('/desk')} />
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
                {meta?.isManagementKey ? ' · management' : ' · standard'}
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
        <AppText variant="title">Get the app</AppText>
        <AppButton
          title="App Store"
          variant="ghost"
          onPress={() => void Linking.openURL(LEGAL.appStoreUrl)}
        />
        <AppText
          variant="caption"
          color={colors.limeSoft}
          onPress={() => void Linking.openURL(LEGAL.websiteUrl)}
        >
          burnline.dev
        </AppText>
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
        <AppText variant="title">About Burnline</AppText>
        <AppText>
          Mobile LLM API spend cockpit. Your API keys stay in the device keychain;
          platform rankings are cached via Supabase for no-key browsing.
        </AppText>
        <AppText variant="caption">Palette · Electric lime #39FF14 on #0B0E0D</AppText>
      </Panel>
    </ScrollView>
  );
}
