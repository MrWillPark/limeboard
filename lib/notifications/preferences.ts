import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_SPIKE_KEY = 'burnline.alerts.local_spike_enabled';

/** Default on once the user has never set a preference. */
export async function getLocalSpikeAlertsEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(LOCAL_SPIKE_KEY);
  if (raw == null) return true;
  return raw === '1' || raw === 'true';
}

export async function setLocalSpikeAlertsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(LOCAL_SPIKE_KEY, enabled ? '1' : '0');
}
