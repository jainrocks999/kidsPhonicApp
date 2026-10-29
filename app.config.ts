/// <reference types="node" />
import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Static config lives in app.json; this adds Firebase only when its config files exist.
 * - Android: google-services.json (restored from the 0.0.17 APK, project "abc-phonics-kids").
 * - iOS: needs GoogleService-Info.plist from the Firebase console. Without it, iOS builds
 *   skip Firebase instead of failing prebuild.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const hasAndroid = existsSync('./google-services.json');
  const hasIos = existsSync('./GoogleService-Info.plist');
  const buildingIos =
    process.env.EAS_BUILD_PLATFORM === 'ios' || process.argv.some((a) => a === 'ios' || a === 'run:ios');
  const firebase = hasAndroid && (hasIos || !buildingIos);

  return {
    ...(config as ExpoConfig),
    android: { ...config.android, ...(hasAndroid && { googleServicesFile: './google-services.json' }) },
    ios: { ...config.ios, ...(hasIos && { googleServicesFile: './GoogleService-Info.plist' }) },
    plugins: [
      ...(config.plugins ?? []),
      ...(firebase
        ? [
            '@react-native-firebase/app',
            '@react-native-firebase/crashlytics',
            ['expo-build-properties', { ios: { useFrameworks: 'dynamic' } }] as [string, object],
          ]
        : []),
    ],
    extra: { ...config.extra, firebase },
  };
};
