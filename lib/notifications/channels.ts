import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const BURN_SPIKE_CHANNEL_ID = 'burn-spike';

export async function ensureBurnSpikeChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(BURN_SPIKE_CHANNEL_ID, {
    name: 'Burn spike alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#39FF14',
  });
}
