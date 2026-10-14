import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Purchases from 'react-native-purchases';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, radii, spacing } from '@/constants/theme';
import { deleteLimeBoardAccount } from '@/lib/auth/delete-account';
import { LEGAL } from '@/lib/config/legal';
import { canUseRevenueCatNative, env } from '@/lib/config/env';
import { useAdminAccount } from '@/hooks/use-admin-account';
import { useEntitlement } from '@/hooks/use-entitlement';
import {
  disableRemoteBurnAlerts,
  fetchRemoteBurnAlertStatus,
  upsertRemoteBurnAlert,
} from '@/lib/alerts/remote-subscription';
import {
  getNotificationPermissionGranted,
  requestNotificationPermissions,
} from '@/lib/notifications/local-spike';
import {
  getLocalSpikeAlertsEnabled,
  setLocalSpikeAlertsEnabled,
} from '@/lib/notifications/preferences';
import { syncPushTokenToSupabase } from '@/lib/notifications/push-token';
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
  const { isPro: entitlementPro } = useEntitlement();
  const { mode: previewMode, setMode: setPreviewMode } = useScreenshotPreview();
  const proUnlocked = isPro || isAdminAccount;
  const [deleting, setDeleting] = useState(false);

  const [localSpikeEnabled, setLocalSpikeEnabled] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [hasMonitorKey, setHasMonitorKey] = useState(false);
  const [monitorKeyDraft, setMonitorKeyDraft] = useState('');
  const [alertsBusy, setAlertsBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      setLocalSpikeEnabled(await getLocalSpikeAlertsEnabled());
      setPermissionGranted(await getNotificationPermissionGranted());
    })();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const status = await fetchRemoteBurnAlertStatus(user.id);
      if (status) {
        setRemoteEnabled(status.enabled);
        setHasMonitorKey(status.hasMonitorKey);
      }
    })();
  }, [user?.id]);

  const onToggleLocalSpike = async (next: boolean) => {
    if (next) {
      const granted = await requestNotificationPermissions();
      setPermissionGranted(granted);
      if (!granted) {
        Alert.alert(
          'Notifications disabled',
          'Enable notifications for Burnline in system Settings to get burn spike alerts.'
        );
        return;
      }
    }
    await setLocalSpikeAlertsEnabled(next);
    setLocalSpikeEnabled(next);
  };

  const onEnableRemote = async () => {
    if (!entitlementPro) {
      router.push('/paywall');
      return;
    }
    if (!user?.id) return;

    const key = monitorKeyDraft.trim();
    if (!hasMonitorKey && !key) {
      Alert.alert(
        'Monitor key required',
        'Paste a dedicated OpenRouter key used only for remote burn monitoring. Session keys stay on this device.'
      );
      return;
    }

    setAlertsBusy(true);
    try {
      await syncPushTokenToSupabase(user.id);
      await upsertRemoteBurnAlert({ enabled: true, monitorKey: key || undefined });
      setRemoteEnabled(true);
      if (key) {
        setHasMonitorKey(true);
        setMonitorKeyDraft('');
      }
      setPermissionGranted(await getNotificationPermissionGranted());
    } catch (e) {
      Alert.alert(
        'Could not enable remote alerts',
        e instanceof Error ? e.message : 'Try again later.'
      );
    } finally {
      setAlertsBusy(false);
    }
  };

  const onDisableRemote = async () => {
    setAlertsBusy(true);
    try {
      await disableRemoteBurnAlerts();
      setRemoteEnabled(false);
    } catch (e) {
      Alert.alert(
        'Could not disable remote alerts',
        e instanceof Error ? e.message : 'Try again later.'
      );
    } finally {
      setAlertsBusy(false);
    }
  };

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
      ]
    );
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
      keyboardShouldPersistTaps="handled"
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
              : 'Free forever — balance, burn, and runway. Pro unlocks charts and fleet.'}
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

      <Panel style={{ gap: spacing.md }}>
        <AppText variant="title">Burn spike alerts</AppText>
        <AppText variant="caption">
          Local alerts fire when Burnline detects abnormal burn while the app is open or
          backgrounded. Pro remote monitoring watches a dedicated key when the app is closed.
        </AppText>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="label">Local spike notifications</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {permissionGranted
                ? 'OS permission granted'
                : 'Permission needed for lock-screen alerts'}
            </AppText>
          </View>
          <Switch
            value={localSpikeEnabled}
            onValueChange={(v) => void onToggleLocalSpike(v)}
            trackColor={{ false: colors.borderStrong, true: colors.limeDim }}
            thumbColor={localSpikeEnabled ? colors.lime : colors.textMuted}
          />
        </View>

        <View style={{ height: 1, backgroundColor: colors.border }} />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label">Remote monitoring (Pro)</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Optional dedicated OpenRouter key, encrypted on our servers. Your session key stays
            on-device. Revoke the monitor key anytime in OpenRouter.
          </AppText>

          {!entitlementPro ? (
            <AppButton title="Upgrade for remote alerts" onPress={() => router.push('/paywall')} />
          ) : (
            <>
              <TextInput
                value={monitorKeyDraft}
                onChangeText={setMonitorKeyDraft}
                placeholder={
                  hasMonitorKey ? 'Replace monitor key (optional)' : 'Paste dedicated monitor key'
                }
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                style={{
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  borderRadius: radii.md,
                  borderCurve: 'continuous',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  color: colors.text,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 13,
                  backgroundColor: colors.bgElevated,
                }}
              />
              {remoteEnabled ? (
                <AppButton
                  title={alertsBusy ? 'Updating…' : 'Disable remote monitoring'}
                  variant="danger"
                  disabled={alertsBusy}
                  onPress={() => void onDisableRemote()}
                />
              ) : (
                <AppButton
                  title={alertsBusy ? 'Enabling…' : 'Enable remote monitoring'}
                  disabled={alertsBusy}
                  onPress={() => void onEnableRemote()}
                />
              )}
              {remoteEnabled && hasMonitorKey ? (
                <AppText variant="caption" color={colors.limeSoft}>
                  Remote monitoring is on
                  {monitorKeyDraft.trim()
                    ? ' — tap Enable again after pasting a replacement key'
                    : ''}
                </AppText>
              ) : null}
              {remoteEnabled && monitorKeyDraft.trim() ? (
                <AppButton
                  title={alertsBusy ? 'Saving…' : 'Save new monitor key'}
                  variant="ghost"
                  disabled={alertsBusy}
                  onPress={() => void onEnableRemote()}
                />
              ) : null}
            </>
          )}
        </View>
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
          Full-screen live burn view for a second monitor, plus an iOS/iPad widget for your desk
          setup.
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
          Mobile LLM API spend cockpit. Session keys stay in the device keychain. Pro users may
          opt in to a separate encrypted monitor key for remote burn spike alerts.
        </AppText>
        <AppText variant="caption">Palette · Electric lime #39FF14 on #0B0E0D</AppText>
      </Panel>
    </ScrollView>
  );
}
