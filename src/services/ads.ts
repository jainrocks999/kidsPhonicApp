import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as Ads from 'react-native-google-mobile-ads';
import monetization from '../../monetization.config.json';
import { recordError } from './analytics';
import { usePurchases } from '@/store/purchases';

type AdsModule = typeof Ads;

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

export const adsAvailable = !!ads;

export function getAdsModule() {
  return ads;
}

let started = false;

export async function initAds() {
  if (!ads || started) return;
  started = true;
  if (usePurchases.getState().noAds) return;
  try {
    await ads.default().setRequestConfiguration({
      maxAdContentRating: ads.MaxAdContentRating.G,
      tagForChildDirectedTreatment: true,
      tagForUnderAgeOfConsent: true,
      testDeviceIdentifiers: monetization.admob.testDeviceIdentifiers,
    });
    await ads.default().initialize();
    preloadInterstitial();
  } catch (error) {
    recordError(error, 'ads init');
  }
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
  if (!ads) return null;
  if (!interstitial) {
    interstitial = ads.InterstitialAd.createForAdRequest(interstitialUnitId(), {
      requestNonPersonalizedAdsOnly: true,
    });
    interstitial.addAdEventListener(ads.AdEventType.CLOSED, () => {
      if (!usePurchases.getState().noAds) interstitial?.load();
    });
  }
  return interstitial;
}

export function preloadInterstitial() {
  if (!ads || usePurchases.getState().noAds) return;
  getInterstitial()?.load();
}

/** Shows a preloaded interstitial if the kid is not ad-free and the frequency cap allows it. */
export async function showInterstitial(): Promise<boolean> {
  if (!ads || usePurchases.getState().noAds) return false;
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
