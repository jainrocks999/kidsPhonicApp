import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage';

type Lang = 'en' | 'vi';

interface SettingsState {
  language: Lang;
  soundEffects: boolean;
  onboarded: boolean;
  setLanguage: (l: Lang) => void;
  setSoundEffects: (v: boolean) => void;
  completeOnboarding: () => void;
  /** Unit ids we've already asked for a store review after (ask at most once per unit). */
  reviewPrompted: string[];
  markReviewPrompted: (unitId: string) => void;
}

/** English-only for now. Set to false (and uncomment the language buttons in settings/onboarding) to re-enable Vietnamese. */
const ENGLISH_ONLY = true;

const deviceLang: Lang = !ENGLISH_ONLY && getLocales()[0]?.languageCode === 'vi' ? 'vi' : 'en';

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: deviceLang,
      soundEffects: true,
      onboarded: false,
      reviewPrompted: [],
      setLanguage: (language) => set({ language }),
      setSoundEffects: (soundEffects) => set({ soundEffects }),
      completeOnboarding: () => set({ onboarded: true }),
      markReviewPrompted: (id) => set((s) => ({ reviewPrompted: [...s.reviewPrompted, id] })),
    }),
    {
      name: 'settings',
      storage: persistStorage,
      // A previously saved 'vi' must not stick while the switch is hidden.
      merge: (saved, current) => ({ ...current, ...(saved as Partial<SettingsState>), ...(ENGLISH_ONLY ? { language: 'en' as Lang } : null) }),
    },
  ),
);
