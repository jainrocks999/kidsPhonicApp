import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage';

type Lang = 'en' | 'vi';

interface SettingsState {
  language: Lang;
  soundEffects: boolean;
  onboarded: boolean;
  /** Level ids unlocked by purchase (e.g. "L2"). "ALL" = bundle. */
  purchases: string[];
  devMode: boolean;
  setLanguage: (l: Lang) => void;
  setSoundEffects: (v: boolean) => void;
  completeOnboarding: () => void;
  addPurchase: (id: string) => void;
  setDevMode: (v: boolean) => void;
}

const deviceLang: Lang = getLocales()[0]?.languageCode === 'vi' ? 'vi' : 'en';

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: deviceLang,
      soundEffects: true,
      onboarded: false,
      purchases: [],
      devMode: false,
      setLanguage: (language) => set({ language }),
      setSoundEffects: (soundEffects) => set({ soundEffects }),
      completeOnboarding: () => set({ onboarded: true }),
      addPurchase: (id) => set((s) => ({ purchases: [...new Set([...s.purchases, id])] })),
      setDevMode: (devMode) => set({ devMode }),
    }),
    { name: 'settings', storage: persistStorage },
  ),
);

export const isLevelOwned = (levelId: string, isPremium: boolean, purchases: string[], devMode: boolean) =>
  !isPremium || devMode || purchases.includes('ALL') || purchases.includes(levelId);
