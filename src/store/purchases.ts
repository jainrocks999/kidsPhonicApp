import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from 'expo-iap';
import monetization from '../../monetization.config.json';
import { persistStorage } from './storage';

/** One-time, non-consumable products created in App Store Connect / Play Console. */
export const PRODUCT_NO_ADS = monetization.iap.noAdsProductId;
export const PRODUCT_ALL_LEVELS = monetization.iap.allLevelsProductId;
export const PRODUCT_IDS = [PRODUCT_NO_ADS, PRODUCT_ALL_LEVELS];

export type ProductId = string;

export const isProductId = (id: string): id is ProductId => PRODUCT_IDS.includes(id);

interface PurchasesState {
  noAds: boolean;
  allLevels: boolean;
  products: Product[];
  buying: ProductId | null;
  restoring: boolean;
  grant: (productId: string) => void;
  setProducts: (products: Product[]) => void;
  setBuying: (id: ProductId | null) => void;
  setRestoring: (restoring: boolean) => void;
  reset: () => void;
}

export const usePurchases = create<PurchasesState>()(
  persist(
    (set) => ({
      noAds: false,
      allLevels: false,
      products: [],
      buying: null,
      restoring: false,
      grant: (productId) =>
        set(() => {
          if (productId === PRODUCT_ALL_LEVELS) return { noAds: true, allLevels: true };
          if (productId === PRODUCT_NO_ADS) return { noAds: true };
          return {};
        }),
      setProducts: (products) => set({ products }),
      setBuying: (buying) => set({ buying }),
      setRestoring: (restoring) => set({ restoring }),
      reset: () => set({ noAds: false, allLevels: false }),
    }),
    {
      name: 'purchases',
      storage: persistStorage,
      partialize: (s) => ({ noAds: s.noAds, allLevels: s.allLevels }),
    },
  ),
);
