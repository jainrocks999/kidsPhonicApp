import { useCallback, useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { create } from 'zustand';

/** False while the launch intro still covers the app — screens wait for it before speaking. */
export const useIntroDone = create(() => ({ done: false }));

// expo-video is a native module: an app binary built before it was added (or Expo Go
// without it) throws on import, which would take the whole root layout down with it.
// Load it defensively and fall back to the logo splash until the app is rebuilt.
let video: typeof import('expo-video') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be catchable, a static import is not
  video = require('expo-video');
} catch {
  console.warn('[IntroSplash] expo-video is not in this build — skipping the intro video. Rebuild the app (npx expo run:android / run:ios).');
}
const HAS_VIDEO = Platform.OS !== 'web' && !!video;

const INTRO_VIDEO = require('../../assets/intro.mp4');
const LOGO = require('../../assets/splash-icon.png');

/** Matches the native splash background (app.json → expo-splash-screen). */
const LOGO_BG = '#0EC19F';
/** Top / bottom edge colours of the intro video, used to fill the letterbox on tall phones. */
const VIDEO_TOP = '#FDFDFD';
const VIDEO_BOTTOM = '#7AA5FC';
const VIDEO_ASPECT = 9 / 16;

const FADE_MS = 300;
/** How long the logo splash stays up after the video. */
const LOGO_MS = 1400;
/** The video is ~4s; never let a stalled player block the app. */
const VIDEO_TIMEOUT_MS = 8000;
/** Show something even if the first video frame never arrives. */
const NATIVE_SPLASH_TIMEOUT_MS = 2000;

const hideNativeSplash = () => {
  SplashScreen.hideAsync().catch(() => {});
};

function IntroVideo({ onEnd }: { onEnd: () => void }) {
  const { useVideoPlayer, VideoView } = video!;
  const { width, height } = useWindowDimensions();
  const player = useVideoPlayer(INTRO_VIDEO, (p) => {
    p.loop = false;
    p.play();
  });

  useEventListener(player, 'playToEnd', onEnd);
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'error') {
      hideNativeSplash();
      onEnd();
    }
  });

  useEffect(() => {
    const splash = setTimeout(hideNativeSplash, NATIVE_SPLASH_TIMEOUT_MS);
    const stalled = setTimeout(onEnd, VIDEO_TIMEOUT_MS);
    return () => {
      clearTimeout(splash);
      clearTimeout(stalled);
    };
  }, [onEnd]);

  // Tall phones: letterbox (the logo spans the full video width, so cropping the
  // sides would cut it) and fill the bars with the video's own edge colours.
  // Wider screens (tablets): crop the empty top/bottom instead.
  const contentFit = width / height > VIDEO_ASPECT ? 'cover' : 'contain';

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.videoTop} />
      <View style={styles.videoBottom} />
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        nativeControls={false}
        surfaceType="textureView"
        onFirstFrameRender={hideNativeSplash}
      />
    </View>
  );
}

/**
 * Launch sequence drawn over the app: brand intro video (full screen) → app logo
 * splash → fade out. The native splash stays up until the video's first frame.
 */
export function IntroSplash({ appReady, onDone }: { appReady: boolean; onDone: () => void }) {
  const { width } = useWindowDimensions();
  // Web blocks autoplay with sound, so it (and builds without expo-video) goes straight to the logo.
  const [videoMounted, setVideoMounted] = useState(HAS_VIDEO);
  const [videoEnded, setVideoEnded] = useState(!HAS_VIDEO);
  const [logoTimeUp, setLogoTimeUp] = useState(false);
  const [videoOpacity] = useState(() => new Animated.Value(1));
  const [rootOpacity] = useState(() => new Animated.Value(1));

  const endVideo = useCallback(() => setVideoEnded(true), []);

  useEffect(() => {
    if (!videoEnded) return;
    hideNativeSplash();
    Animated.timing(videoOpacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() =>
      setVideoMounted(false),
    );
    const t = setTimeout(() => setLogoTimeUp(true), LOGO_MS);
    return () => clearTimeout(t);
  }, [videoEnded, videoOpacity]);

  useEffect(() => {
    if (!logoTimeUp || !appReady) return;
    Animated.timing(rootOpacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => {
      useIntroDone.setState({ done: true });
      onDone();
    });
  }, [logoTimeUp, appReady, rootOpacity, onDone]);

  const logoSize = Math.min(width * 0.6, 280);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: rootOpacity }]}>
      <StatusBar hidden={!videoEnded} style="light" />
      <Image source={LOGO} style={{ width: logoSize, height: logoSize }} contentFit="contain" />
      {videoMounted && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}>
          <IntroVideo onEnd={endVideo} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: LOGO_BG, alignItems: 'center', justifyContent: 'center' },
  videoTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: VIDEO_TOP },
  videoBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', backgroundColor: VIDEO_BOTTOM },
});
