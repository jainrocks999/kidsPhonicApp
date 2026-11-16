import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { create } from 'zustand';
import type * as Ads from 'react-native-google-mobile-ads';
import monetization from '../../monetization.config.json';
import { recordError } from './analytics';
import { usePurchases } from '@/store/purchases';

type AdsModule = typeof Ads;

const childDirectedOnly = monetization.admob.childDirectedOnly === true;

const supported =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let ads: AdsModule | null = null;
if (supported) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ads = require('react-native-google-mobile-ads') as AdsModule;
  } catch {
    ads = null;
  }
}

/** Fail closed: this is a kids app, so ads only run when child-directed mode is enforced. */
export const adsAvailable = !!ads && childDirectedOnly;

/** Every ad request must be non-personalized for child-directed treatment. */
export const adRequestOptions = { requestNonPersonalizedAdsOnly: true } as const;

export function getAdsModule() {
  return adsAvailable ? ads : null;
}

/**
 * True only once the child-directed request configuration has been applied. No ad may be
 * requested before that, otherwise the first request would go out without the child tags.
 */
export const useAdsReady = create(() => ({ ready: false }));

function adsReady() {
  return adsAvailable && useAdsReady.getState().ready;
}

let starting: Promise<void> | null = null;

export function initAds(): Promise<void> {
  if (!adsAvailable || usePurchases.getState().noAds) return Promise.resolve();
  starting ??= (async () => {
    try {
      await ads!.default().setRequestConfiguration({
        maxAdContentRating: ads!.MaxAdContentRating.G,
        tagForChildDirectedTreatment: true,
        tagForUnderAgeOfConsent: true,
        testDeviceIdentifiers: monetization.admob.testDeviceIdentifiers,
      });
      await ads!.default().initialize();
      useAdsReady.setState({ ready: true });
      preloadInterstitial();
    } catch (error) {
      // Fail closed: without the child-directed configuration no ads are shown this session.
      recordError(error, 'ads init');
    }
  })();
  return starting;
}

function interstitialUnitId() {
  return Platform.OS === 'ios'
    ? monetization.admob.iosInterstitialUnitId
    : monetization.admob.androidInterstitialUnitId;
}

let interstitial: Ads.InterstitialAd | null = null;
let lastInterstitialAt = 0;
let interstitialsShown = 0;

function getInterstitial() {
  if (!adsReady()) return null;
  if (!interstitial) {
    interstitial = ads!.InterstitialAd.createForAdRequest(interstitialUnitId(), adRequestOptions);
    interstitial.addAdEventListener(ads!.AdEventType.CLOSED, () => {
      if (!usePurchases.getState().noAds) interstitial?.load();
    });
  }
  return interstitial;
}

export function preloadInterstitial() {
  if (!adsReady() || usePurchases.getState().noAds) return;
  getInterstitial()?.load();
}

/** Shows a preloaded interstitial if the kid is not ad-free and the frequency cap allows it. */
export async function showInterstitial(): Promise<boolean> {
  if (!adsReady() || usePurchases.getState().noAds) return false;
  if (interstitialsShown >= monetization.admob.interstitialMaxPerSession) return false;
  if (Date.now() - lastInterstitialAt < monetization.admob.interstitialCooldownSeconds * 1000) {
    return false;
  }

  const ad = getInterstitial();
  if (!ad) return false;
  if (!ad.loaded) {
    ad.load();
    return false;
  }

  try {
    await ad.show();
    lastInterstitialAt = Date.now();
    interstitialsShown += 1;
    return true;
  } catch (error) {
    recordError(error, 'interstitial show');
    return false;
  }
}
