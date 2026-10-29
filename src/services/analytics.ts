import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Firebase Analytics + Crashlytics (same Firebase project as the original app).
 * Native modules only exist in dev/production builds — in Expo Go (or without Firebase
 * config) every call here is a no-op, so the rest of the app never has to care.
 */
type AnalyticsMod = typeof import('@react-native-firebase/analytics');
type CrashlyticsMod = typeof import('@react-native-firebase/crashlytics');

let analytics: AnalyticsMod | null = null;
let crashlytics: CrashlyticsMod | null = null;

const enabled =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && !!Constants.expoConfig?.extra?.firebase;

if (enabled) {
  try {
    // Guarded require: the native module is missing in Expo Go, a static import would crash.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    analytics = require('@react-native-firebase/analytics') as AnalyticsMod;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    crashlytics = require('@react-native-firebase/crashlytics') as CrashlyticsMod;
  } catch {
    analytics = crashlytics = null;
  }
}

type Params = Record<string, string | number | boolean>;

export function logEvent(name: string, params?: Params) {
  if (!analytics) return;
  try {
    void analytics.logEvent(analytics.getAnalytics(), name, params);
  } catch {}
}

export function logScreen(screen: string) {
  if (!analytics) return;
  try {
    void analytics.logScreenView(analytics.getAnalytics(), { screen_name: screen, screen_class: screen });
  } catch {}
}

export function recordError(error: unknown, context?: string) {
  if (!crashlytics) return;
  const c = crashlytics.getCrashlytics();
  if (context) crashlytics.log(c, context);
  crashlytics.recordError(c, error instanceof Error ? error : new Error(String(error)));
}

/** Forward uncaught JS errors to Crashlytics (native crashes are captured automatically). */
export function initCrashReporting() {
  if (!crashlytics) return;
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } };
  const eu = g.ErrorUtils;
  if (!eu) return;
  const prev = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => {
    recordError(e, fatal ? 'fatal' : 'non-fatal');
    prev(e, fatal);
  });
}
