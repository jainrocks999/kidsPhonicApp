import { router, type Href } from 'expo-router';
import { lockedFeedback } from '@/services/lock';
import { useSettings } from '@/store/settings';

/** Grown-up-only destinations (purchases, settings) go through the parental gate first. */
export function openGated(next: string) {
  router.push({ pathname: '/parental-gate', params: { next } } as Href);
}

/** Locked tiles only ever lead to the gate — a child never sees an offer or a price. */
export function openLockedPaywall() {
  lockedFeedback(useSettings.getState().language);
  openGated('/paywall');
}
