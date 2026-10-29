import { useSettings } from '@/store/settings';

/**
 * Billing boundary. The original app used Google Play Billing with one-time products
 * (per level + "all levels" bundle). Wire this to expo-iap / react-native-iap (needs a dev
 * build) and real product ids from Play Console. Until then purchases only work in dev builds.
 */
export type ProductId = string; // "L2" … "L5" | "ALL"

export async function purchase(id: ProductId): Promise<void> {
  if (!__DEV__) throw new Error('billing-not-configured');
  useSettings.getState().addPurchase(id);
}

export async function restorePurchases(): Promise<ProductId[]> {
  if (!__DEV__) throw new Error('billing-not-configured');
  return useSettings.getState().purchases;
}
