import { useSyncExternalStore } from 'react';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';

const stores = [useSettings, useProgress];
const getSnapshot = () => stores.every((s) => s.persist.hasHydrated());
const subscribe = (cb: () => void) => {
  const unsubs = stores.map((s) => s.persist.onFinishHydration(cb));
  return () => unsubs.forEach((u) => u());
};

/** True once every persisted store has loaded from AsyncStorage. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
