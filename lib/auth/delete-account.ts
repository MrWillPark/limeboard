import { env, isSupabaseConfigured } from '@/lib/config/env';
import { clearApiKey } from '@/lib/auth/secure-key';
import { getSupabase } from '@/lib/supabase/client';
import { isRevenueCatConfigured } from '@/lib/config/env';
import Purchases from 'react-native-purchases';

/**
 * Deletes the LimeBoard auth user server-side, clears local OpenRouter key,
 * logs out of RevenueCat, and signs out locally.
 */
export async function deleteLimeBoardAccount(): Promise<void> {
  if (!isSupabaseConfigured() || !env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Supabase is not configured');
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session');
  }

  const res = await fetch(`${env.supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: env.supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  if (!res.ok) {
    let message = `Delete failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  try {
    await clearApiKey();
  } catch {
    // ignore local key clear failures
  }

  if (isRevenueCatConfigured()) {
    try {
      await Purchases.logOut();
    } catch {
      // ignore
    }
  }

  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // User may already be gone server-side
  }
}
