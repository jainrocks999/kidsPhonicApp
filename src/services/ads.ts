import { AppState, Platform } from 'react-native';
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
export const useAdsReady = create(() => ({
  ready: false,
  /** True while the banner sits out a cooldown after a failed load. */
  bannerPaused: false,
}));

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
        testDeviceIdentifiers: __DEV__
          ? ['EMULATOR', ...monetization.admob.testDeviceIdentifiers]
          : monetization.admob.testDeviceIdentifiers,
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

const cfg = monetization.admob;

/**
 * Ad unit ids for this platform. Debug builds always use Google's test units, so real units
 * never get development traffic. An empty id means that format is off on this platform.
 */
export function adUnitIds() {
  const ios = Platform.OS === 'ios';
  const live = {
    banner: ios ? cfg.iosBannerUnitId : cfg.androidBannerUnitId,
    interstitial: ios ? cfg.iosInterstitialUnitId : cfg.androidInterstitialUnitId,
    native: ios ? cfg.iosNativeUnitId : cfg.androidNativeUnitId,
  };
  if (!__DEV__ || !ads) return live;
  return {
    banner: ads.TestIds.BANNER,
    interstitial: ads.TestIds.INTERSTITIAL,
    native: live.native ? ads.TestIds.NATIVE : '',
  };
}

/**
 * Apple Kids Category (1.3): an ad tap leaves the app, so on iOS a transparent layer catches
 * taps on every ad and asks for the parental gate first.
 */
export const gateAdTaps = Platform.OS === 'ios';

/** How long an ad stays tappable after a grown-up passes the gate. */
export const AD_UNLOCK_MS = 15 * 1000;

/* ---------- banner ---------- */

// After a failed load, hold new requests for a while so AdMob doesn't answer with
// "Too many recently failed requests".
const RETRY_AFTER_MS = 60 * 1000;

let bannerTimer: ReturnType<typeof setTimeout> | undefined;

/** Hides the banner (and gives its space back to the screens), then retries with a fresh one. */
export function pauseBannerAfterFailure() {
  clearTimeout(bannerTimer);
  useAdsReady.setState({ bannerPaused: true });
  bannerTimer = setTimeout(() => useAdsReady.setState({ bannerPaused: false }), RETRY_AFTER_MS);
}

/* ---------- full-screen ads ---------- */

// Shown only at natural breaks (lesson / level finished), never mid-lesson, on launch or on
// exit. The next ad is loaded ahead of time, so at a break it shows instantly or is skipped:
// the child never waits on the network.
//
// Where a native unit is configured (iOS) the full-screen ad is a native ad in our own view,
// so the parental gate can sit in front of it. Otherwise it is a regular interstitial.

// Loaded ads expire after an hour; reload before that.
const AD_TTL_MS = 50 * 60 * 1000;

let lastFailedAt = 0;
let lastShownAt = 0;
let shownThisSession = 0;
// Only one full-screen ad at a time.
let busy = false;

const inCooldown = () => Date.now() - lastFailedAt < RETRY_AFTER_MS;

let interstitial: Ads.InterstitialAd | null = null;
let interstitialLoadedAt = 0;

function preloadInterstitialAd() {
  const unitId = adUnitIds().interstitial;
  if (interstitial || inCooldown() || !unitId) return;
  const ad = ads!.InterstitialAd.createForAdRequest(unitId, adRequestOptions);
  interstitial = ad;
  ad.addAdEventListener(ads!.AdEventType.LOADED, () => {
    if (interstitial !== ad) return;
    interstitialLoadedAt = Date.now();
    lastFailedAt = 0;
  });
  ad.addAdEventListener(ads!.AdEventType.ERROR, () => {
    lastFailedAt = Date.now();
    if (interstitial === ad && !busy) interstitial = null;
  });
  ad.load();
}

/** Resolves once the interstitial is closed (true) or could not be shown (false). */
function showInterstitialAd(): Promise<boolean> {
  if (interstitial?.loaded && Date.now() - interstitialLoadedAt > AD_TTL_MS) interstitial = null;
  const ad = interstitial;
  if (!ad?.loaded) {
    preloadInterstitial();
    return Promise.resolve(false);
  }

  busy = true;
  return new Promise((resolve) => {
    const unsubs: (() => void)[] = [];
    let done = false;
    const finish = (shown: boolean, error?: unknown) => {
      if (done) return;
      done = true;
      unsubs.forEach((u) => u());
      if (error) recordError(error, 'interstitial show');
      busy = false;
      interstitial = null;
      preloadInterstitial();
      resolve(shown);
    };
    unsubs.push(
      ad.addAdEventListener(ads!.AdEventType.CLOSED, () => finish(true)),
      ad.addAdEventListener(ads!.AdEventType.ERROR, (error) => finish(false, error)),
    );
    ad.show().catch((error) => finish(false, error));
  });
}

let nativeAd: Ads.NativeAd | null = null;
let nativeLoading = false;
let nativeLoadedAt = 0;

function preloadNativeAd() {
  const unitId = adUnitIds().native;
  if (nativeAd || nativeLoading || inCooldown() || !unitId) return;
  nativeLoading = true;
  ads!.NativeAd.createForAdRequest(unitId, { ...adRequestOptions, startVideoMuted: true })
    .then((ad) => {
      nativeAd = ad;
      nativeLoadedAt = Date.now();
      lastFailedAt = 0;
    })
    .catch(() => {
      lastFailedAt = Date.now();
    })
    .finally(() => {
      nativeLoading = false;
    });
}

type NativeAdPresenter = (ad: Ads.NativeAd, onClosed: () => void) => void;

let presenter: NativeAdPresenter | null = null;

/** Registered by <NativeFullScreenAdHost>, the view that puts a loaded native ad on screen. */
export function setNativeAdPresenter(next: NativeAdPresenter | null) {
  presenter = next;
}

async function showNativeAd(): Promise<boolean> {
  if (nativeAd && Date.now() - nativeLoadedAt > AD_TTL_MS) {
    nativeAd.destroy();
    nativeAd = null;
  }
  const ad = nativeAd;
  const present = presenter;
  if (!ad || !present) {
    preloadInterstitial();
    return false;
  }
  nativeAd = null;
  busy = true;
  try {
    await new Promise<void>((resolve) => present(ad, resolve));
    return true;
  } finally {
    busy = false;
    preloadInterstitial();
  }
}

/** Loads the next full-screen ad ahead of time. */
export function preloadInterstitial() {
  if (!adsReady() || usePurchases.getState().noAds) return;
  if (adUnitIds().native) preloadNativeAd();
  else preloadInterstitialAd();
}

/**
 * Shows a full-screen ad at a natural break if one is ready, the kid is not ad-free and the
 * frequency cap allows it. Never rejects: resolves right away (false) when skipped, otherwise
 * once the ad is closed — so callers can continue with `.then(next)`.
 */
export async function showInterstitial(): Promise<boolean> {
  if (!adsReady() || usePurchases.getState().noAds || busy) return false;
  if (AppState.currentState !== 'active') return false;
  if (shownThisSession >= cfg.interstitialMaxPerSession) return false;
  if (Date.now() - lastShownAt < cfg.interstitialCooldownSeconds * 1000) return false;

  try {
    const shown = await (adUnitIds().native ? showNativeAd() : showInterstitialAd());
    if (shown) {
      lastShownAt = Date.now();
      shownThisSession += 1;
    }
    return shown;
  } catch (error) {
    recordError(error, 'full-screen ad');
    return false;
  }
}
