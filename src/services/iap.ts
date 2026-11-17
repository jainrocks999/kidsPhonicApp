import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as Iap from 'expo-iap';
import { logEvent, recordError } from './analytics';
import { isProductId, PRODUCT_IDS, usePurchases, type ProductId } from '@/store/purchases';

type IapModule = typeof Iap;

const supported =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let iap: IapModule | null = null;
if (supported) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    iap = require('expo-iap') as IapModule;
  } catch {
    iap = null;
  }
}

export const iapAvailable = !!iap;

let started = false;
let connected = false;
let subscriptions: { remove: () => void }[] = [];

function grant(purchase: Iap.Purchase) {
  if (purchase.purchaseState !== 'purchased' || !isProductId(purchase.productId)) return false;
  usePurchases.getState().grant(purchase.productId);
  logEvent('purchase_granted', { product: purchase.productId });
  return true;
}

async function finish(purchase: Iap.Purchase) {
  try {
    await iap?.finishTransaction({ purchase, isConsumable: false });
  } catch (error) {
    recordError(error, 'iap finishTransaction');
  }
}

async function handlePurchase(purchase: Iap.Purchase) {
  if (!grant(purchase)) return;
  usePurchases.getState().setBuying(null);
  await finish(purchase);
}

export async function syncPurchases() {
  if (!iap || !connected) return false;
  try {
    const purchases = await iap.getAvailablePurchases();
    let found = false;
    for (const purchase of purchases) {
      if (!grant(purchase)) continue;
      found = true;
      if ('isAcknowledgedAndroid' in purchase && purchase.isAcknowledgedAndroid === false) {
        await finish(purchase);
      }
    }
    return found;
  } catch (error) {
    recordError(error, 'iap sync');
    return false;
  }
}

export async function initIAP() {
  if (!iap || started) return;
  started = true;
  subscriptions = [
    iap.purchaseUpdatedListener((purchase) => {
      void handlePurchase(purchase);
    }),
    iap.purchaseErrorListener((error) => {
      usePurchases.getState().setBuying(null);
      if (iap?.isUserCancelledError(error)) return;
      recordError(error, 'iap purchase');
    }),
  ];
  try {
    connected = await iap.initConnection();
    if (!connected) return;
    const products = (await iap.fetchProducts({ skus: [...PRODUCT_IDS], type: 'in-app' })) ?? [];
    usePurchases.getState().setProducts(products.filter((product) => product.type === 'in-app') as Iap.Product[]);
    await syncPurchases();
  } catch (error) {
    recordError(error, 'iap init');
  }
}

export async function buyProduct(productId: ProductId) {
  if (!iap || !connected) return;
  usePurchases.getState().setBuying(productId);
  try {
    await iap.requestPurchase({
      request: { apple: { sku: productId }, google: { skus: [productId] } },
      type: 'in-app',
    });
  } catch (error) {
    console.log(error)
    usePurchases.getState().setBuying(null);
    recordError(error, 'iap requestPurchase');
  }
}

export async function restoreAllPurchases() {
  if (!iap || !connected) return false;
  usePurchases.getState().setRestoring(true);
  try {
    await iap.restorePurchases();
    const found = await syncPurchases();
    logEvent('purchases_restored', { found });
    return found;
  } catch (error) {
    recordError(error, 'iap restorePurchases');
    return false;
  } finally {
    usePurchases.getState().setRestoring(false);
  }
}

export async function closeIAP() {
  subscriptions.forEach((subscription) => subscription.remove());
  subscriptions = [];
  started = false;
  connected = false;
  if (iap) await iap.endConnection().catch(() => false);
}
