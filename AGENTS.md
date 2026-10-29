This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## This project (ABC Phonics Kids — React Native port of `com.beely.phonicskids`)

- Content lives in `rn_assets/` (curriculum, stories, blend/chant timing meta, audio, images, fonts).
- Metro only bundles literal `require()`s, so every media file is listed in `src/assets/registry.generated.ts`.
  **Run `npm run assets` after adding/removing files in `rn_assets/`** (also runs on `npm install`).
  Look media up through helpers in `src/assets/index.ts`, never by hand-built require paths.
- Lesson audio folder key = `L{level}U{unit:02}_{letter}_{firstWord}` (see `lessonAssetKey`).
- All content (5 levels × 8 units) is bundled in `rn_assets/` — no CDN. Anything missing falls back
  to `expo-speech` TTS / emoji. `rn_assets/data/content_manifest.json` is the original app's pack list,
  kept for reference only (unused).
- State: zustand + AsyncStorage (`src/store`). Strings: `src/i18n/{en,vi}.json` (decoded from the APK).
- No paywall/ads/locks by design: every level, unit, story and game is open.
- No analytics yet: `services/analytics.ts` is a no-op boundary already called app-wide.
- Native-only features (Play in-app updates) need a dev build: `npx expo run:android`.
- `npm run licenses` regenerates `src/data/licenses.generated.json` (also on install).
- `npm run timing` (macOS only — uses `afconvert`) measures when words are spoken in the sound-intro and
  chant audio → `rn_assets/data/voice_timing.json`, which drives the lesson highlights. Re-run after changing lesson audio.
