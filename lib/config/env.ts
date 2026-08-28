import Constants from 'expo-constants';

/**
 * EXPO_PUBLIC_* must use static `process.env.EXPO_PUBLIC_FOO` access so Metro
 * inlines them at bundle time (EAS production builds). Dynamic process.env[key]
 * is undefined in release binaries.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  /** Dev-only Pro bypass — never active in production builds. */
  devPro: __DEV__ && process.env.EXPO_PUBLIC_DEV_PRO === 'true',
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function isRevenueCatConfigured(): boolean {
  if (process.env.EXPO_OS === 'ios') return Boolean(env.revenueCatIosKey);
  if (process.env.EXPO_OS === 'android') return Boolean(env.revenueCatAndroidKey);
  return Boolean(env.revenueCatIosKey || env.revenueCatAndroidKey);
}

/** RevenueCat native IAP requires a dev/production build — not Expo Go. */
export function canUseRevenueCatNative(): boolean {
  if (Constants.appOwnership === 'expo') return false;
  return isRevenueCatConfigured();
}
