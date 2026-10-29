import { Linking } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { useSettings } from '@/store/settings';

/** Native review sheet after a finished unit — at most once per unit, OS rate-limits further. */
export async function maybeRequestReview(unitId: string) {
  const s = useSettings.getState();
  if (s.reviewPrompted.includes(unitId) || s.reviewPrompted.length >= 3) return;
  if (!(await StoreReview.hasAction())) return;
  s.markReviewPrompted(unitId);
  await StoreReview.requestReview().catch(() => {});
}

/** Settings → "Rate app": open the store listing directly (always works, unlike the sheet). */
export async function openStoreListing() {
  const url = StoreReview.storeUrl() ?? 'market://details?id=com.beely.phonicskids';
  await Linking.openURL(url).catch(() =>
    Linking.openURL('https://play.google.com/store/apps/details?id=com.beely.phonicskids'),
  );
}
