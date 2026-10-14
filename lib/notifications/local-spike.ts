import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { BURN_SPIKE_CHANNEL_ID, ensureBurnSpikeChannel } from '@/lib/notifications/channels';
import { getLocalSpikeAlertsEnabled } from '@/lib/notifications/preferences';

export const BURN_SPIKE_NOTIFICATION_TYPE = 'burn_spike';

let handlerConfigured = false;

/** Present banners/list when a notification arrives in the foreground. */
export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  await ensureBurnSpikeChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getNotificationPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Fire a local OS notification for a burn spike.
 * Skips when the app is active (cockpit banner covers that) or prefs/permission deny.
 */
export async function maybeNotifyLocalBurnSpike(reason: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (AppState.currentState === 'active') return;

  const enabled = await getLocalSpikeAlertsEnabled();
  if (!enabled) return;

  const granted = await getNotificationPermissionGranted();
  if (!granted) return;

  await ensureBurnSpikeChannel();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Burn spike',
      body: reason,
      data: { type: BURN_SPIKE_NOTIFICATION_TYPE, screen: 'cockpit' },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: BURN_SPIKE_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}
