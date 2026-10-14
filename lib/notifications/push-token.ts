import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { ensureBurnSpikeChannel } from '@/lib/notifications/channels';
import { requestNotificationPermissions } from '@/lib/notifications/local-spike';
import { getSupabase } from '@/lib/supabase/client';

function easProjectId(): string | null {
  const fromExtra = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra;
  const easConfig = (Constants as { easConfig?: { projectId?: string } }).easConfig;
  return easConfig?.projectId ?? null;
}

/** Request permission and return an Expo push token, or null. */
export async function registerForExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  await ensureBurnSpikeChannel();

  const projectId = easProjectId();
  if (!projectId) {
    console.warn('EAS projectId missing — cannot fetch Expo push token');
    return null;
  }

  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return result.data;
  } catch (e) {
    console.warn('getExpoPushTokenAsync failed', e);
    return null;
  }
}

/** Upsert the device Expo push token for the signed-in user. */
export async function syncPushTokenToSupabase(userId: string): Promise<string | null> {
  const token = await registerForExpoPushToken();
  if (!token) return null;

  const supabase = getSupabase();
  if (!supabase) return token;

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn('push_tokens upsert failed', error.message);
  }

  return token;
}
