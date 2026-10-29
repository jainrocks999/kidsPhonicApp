import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { create } from 'zustand';
import { recordError } from './analytics';

/**
 * Google Play in-app updates (flexible flow): download in the background, then show
 * "Update ready → Restart". iOS opens the App Store sheet. No-op in Expo Go / dev.
 */
type Mod = typeof import('expo-in-app-updates');
let mod: Mod | null = null;
if (!__DEV__ && Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  try {
    // Guarded require: native module only exists in store/dev builds.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('expo-in-app-updates') as Mod;
  } catch {
    mod = null;
  }
}

export const useAppUpdate = create<{ ready: boolean }>(() => ({ ready: false }));

export function initAppUpdates() {
  if (!mod) return () => {};
  const off = mod.addUpdateListener('updateDownloaded', (e) => {
    if (e.readyToInstall) useAppUpdate.setState({ ready: true });
  });
  (async () => {
    try {
      const info = await mod!.checkForUpdate();
      if (!info.updateAvailable) return;
      if (Platform.OS === 'android') await mod!.startUpdate(false);
    } catch (e) {
      recordError(e, 'in-app update check');
    }
  })();
  return off;
}

/** Android: installs the downloaded flexible update (app restarts). */
export function installUpdate() {
  mod?.startUpdate(false).catch((e) => recordError(e, 'in-app update install'));
}
