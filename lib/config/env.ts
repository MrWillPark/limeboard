import Constants from 'expo-constants';

function read(key: string): string | undefined {
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  return extra?.[key];
}

export const env = {
  supabaseUrl: read('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: read('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  revenueCatIosKey: read('EXPO_PUBLIC_REVENUECAT_IOS_KEY'),
  revenueCatAndroidKey: read('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY'),
  devPro: read('EXPO_PUBLIC_DEV_PRO') === 'true',
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function isRevenueCatConfigured(): boolean {
  if (process.env.EXPO_OS === 'ios') return Boolean(env.revenueCatIosKey);
  if (process.env.EXPO_OS === 'android') return Boolean(env.revenueCatAndroidKey);
  return Boolean(env.revenueCatIosKey || env.revenueCatAndroidKey);
}
