import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Native iOS widgets need a dev/production build — not Expo Go. */
export function isWidgetSyncAvailable() {
  if (Platform.OS !== 'ios') return false;
  if (Constants.appOwnership === 'expo') return false;
  return true;
}
