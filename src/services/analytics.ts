/**
 * Analytics / crash-reporting boundary. Currently a no-op — the rest of the app already calls
 * these at the right moments (screens, lesson/unit/level/story/game completion, errors), so
 * plugging in a provider (e.g. Firebase Analytics + Crashlytics) only means implementing this file.
 */
type Params = Record<string, string | number | boolean>;

export function logEvent(_name: string, _params?: Params) {}

export function logScreen(_screen: string) {}

export function recordError(_error: unknown, _context?: string) {}

export function initCrashReporting() {}
