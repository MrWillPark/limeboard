import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

/** Native Sign in with Apple (not available in Expo Go — requires dev client build). */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}
