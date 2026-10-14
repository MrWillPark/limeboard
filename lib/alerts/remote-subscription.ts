import { env } from '@/lib/config/env';
import { getSupabase } from '@/lib/supabase/client';

export type RemoteBurnAlertStatus = {
  enabled: boolean;
  hasMonitorKey: boolean;
  lastFiredAt: string | null;
};

export async function fetchRemoteBurnAlertStatus(
  userId: string
): Promise<RemoteBurnAlertStatus | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('burn_alert_subscriptions')
    .select('enabled, monitor_key_ciphertext, last_fired_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('fetchRemoteBurnAlertStatus', error.message);
    return null;
  }

  if (!data) {
    return { enabled: false, hasMonitorKey: false, lastFiredAt: null };
  }

  return {
    enabled: Boolean(data.enabled),
    hasMonitorKey: Boolean(data.monitor_key_ciphertext),
    lastFiredAt: data.last_fired_at ?? null,
  };
}

/**
 * Enable/update remote burn monitoring via Edge Function (encrypts the monitor key server-side).
 */
export async function upsertRemoteBurnAlert(args: {
  enabled: boolean;
  monitorKey?: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Sign in required');
  }

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Supabase is not configured');
  }

  const url = `${env.supabaseUrl}/functions/v1/burn-alert-subscribe`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      apikey: env.supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      enabled: args.enabled,
      monitorKey: args.monitorKey?.trim() || undefined,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Could not update remote alerts (${res.status})`);
  }
}

export async function disableRemoteBurnAlerts(): Promise<void> {
  await upsertRemoteBurnAlert({ enabled: false });
}
