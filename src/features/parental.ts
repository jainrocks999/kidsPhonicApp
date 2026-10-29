import { router, type Href } from 'expo-router';

/** Grown-up-only destinations (purchases, settings) go through the parental gate first. */
export function openGated(next: string) {
  router.push({ pathname: '/parental-gate', params: { next } } as Href);
}
