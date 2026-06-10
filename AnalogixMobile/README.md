# AnalogixMobile

React Native + Expo + Material 3 Expressive client for Analogix.

- **Expo SDK 54** (managed workflow, New Architecture enabled)
- **React Native 0.81**
- **React 19.1**
- **react-native-paper v5** with custom M3 Expressive theme overrides (larger shape scale, spring motion, expressive typography)
- **Apollo Client** with HTTP + `graphql-ws` subscriptions
- **Supabase JS** for auth (Google sign-in via `expo-auth-session` + PKCE — no native Firebase needed)
- **react-native-mmkv** for offline cache + secure token storage
- **react-native-reanimated 4** + **react-native-worklets** for spring animations
- **react-native-math-view** for LaTeX (formulas)
- **react-native-svg** for vector illustrations + progress rings
- **react-native-vector-icons** (Material Design Icons, per-family package)

## Setup

```bash
# from the monorepo root
npm install
npm run build:shared
cp AnalogixMobile/.env.example AnalogixMobile/.env
# …fill in real values…
npm run dev:mobile
```

This starts Expo Dev Client on port `8081`. Scan the QR code with Expo Go
(iOS/Android) or press `i` / `a` for the simulator.

> The root `npm run dev:mobile` is a thin alias for
> `npm run start --workspace=AnalogixMobile`, which in turn runs `expo start`.

## Environment variables

All variables are read from `process.env` via `src/config.ts` and must be
prefixed with `EXPO_PUBLIC_` so Expo inlines them into the bundle at build
time.

| Var | Description |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | From Supabase dashboard (anon/public key) |
| `EXPO_PUBLIC_GRAPHQL_HTTP_URL` | `http://localhost:4000/graphql` (dev) — use `10.0.2.2` from the Android emulator |
| `EXPO_PUBLIC_GRAPHQL_WS_URL` | `ws://localhost:4000/graphql` (dev) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | iOS OAuth client ID (from Google Cloud Console) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Android OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Web OAuth client ID (for Expo Go) |
| `EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME` | Defaults to `analogix` (matches `app.json` scheme + `makeRedirectUri` in `LoginScreen`) |
| `EXPO_TOKEN` | EAS access token (for `eas build` / `eas submit` on CI) |

Every value is centralized in `src/config.ts` — never read `process.env`
directly in feature code, import from there. `config.ts` also falls back to
`expo-constants` `extra` values for EAS-build scenarios.

## Google sign-in setup (PKCE)

Uses `expo-auth-session` (browser-based OAuth, not native Firebase). **No
`GoogleService-Info.plist` or `google-services.json` files are needed.**

1. In the [Google Cloud Console](https://console.cloud.google.com), create an
   OAuth 2.0 Client ID for **each** platform you want to support:
   - **iOS** — bundle ID = `com.analogix.app` (from `app.json`)
   - **Android** — package = `com.analogix.app`, SHA-1 from `npx expo credentials:manager`
   - **Web** — redirect URI = `https://auth.expo.io/@YOUR-EXPO-USERNAME/analogix-mobile`
2. Copy the three client IDs into `AnalogixMobile/.env`.
3. In the Supabase dashboard → **Authentication → Providers → Google**, paste
   the Web client ID and secret.
4. `LoginScreen` calls
   `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } })`,
   opens the URL in `expo-web-browser` via `WebBrowser.openAuthSessionAsync`,
   then exchanges the returned `code` with `supabase.auth.exchangeCodeForSession()`
   (PKCE flow). On web, it falls back to a redirect-based implicit flow.

## Project layout

```
AnalogixMobile/
├── app.json                    # Expo config (iOS + Android + plugins)
├── eas.json                    # EAS build profiles (development / preview / production)
├── index.ts                    # Expo entry → registerRootComponent(Main)
├── Main.tsx                    # root: providers + RootNavigator
├── package.json
├── tsconfig.json
├── eslint.config.ts            # ESLint v10 flat config
├── assets/                     # icon, splash, adaptive-icon
└── src/
    ├── config.ts               # reads EXPO_PUBLIC_* env (single source of truth)
    ├── supabase.ts             # Supabase JS client singleton (MMKV-backed session storage)
    ├── apollo/                 # Apollo client + provider (HTTP + WS)
    ├── context/                # AuthContext (Supabase + MMKV), TourContext, ThemeContext
    ├── graphql/queries/        # all GraphQL operations
    ├── hooks/                  # Reanimated motion helpers, usePythonExecution, useResponsive, …
    ├── navigation/             # RootNavigator + MaterialTabBar + screen types
    ├── components/             # Icon, FormulaRenderer, ChatQuickActions, … (see file list)
    ├── screens/
    │   ├── auth/               # Login, Onboarding, Terms, PrivacyPolicy
    │   ├── dashboard/          # Dashboard, Achievements
    │   ├── chat/               # ChatList, ChatSession (streaming)
    │   ├── study/              # Flashcards, Quiz, Calendar, Formulas, Timer, StudySchedule, AssessmentGuide
    │   ├── subjects/           # SubjectsList, SubjectDetail, DocumentEditor
    │   ├── rooms/              # RoomsList, RoomDetail
    │   └── profile/            # Profile, Settings, ThemePicker, PersonalityEditor, MemoryManager, Support, Privacy
    ├── theme/                  # M3 Expressive theme + tokens
    ├── shared/                 # Cross-screen utilities
    ├── storage/                # MMKV helpers
    ├── types/                  # App-level TS types
    └── utils/                  # Misc helpers
```

## Navigation

6 tab stacks: **Home**, **Tutor**, **Study**, **Subjects**, **Rooms**, **Profile**

- Custom `MaterialTabBar` with a spring-scaled pill indicator (M3 Expressive)
- Auth gate: when `useAuth().user` is null, only `Login` + `Onboarding` are mounted
- Native stack transitions (`slide_from_right`)
- Root-level modal routes: `Login`, `Onboarding`, `Terms`, `PrivacyPolicy`, `Modal`

See `src/navigation/types.ts` for the full route param list.

## Theme

- Light + dark MD3 base
- 5 brand color schemes: **Cosmic** (default), **Paper**, **Sunrise**, **Forest**, **Rose**
- Persisted to MMKV under `analogix.theme`
- Shape scale extended past MD3 defaults: `xl 28dp`, `xxl 36dp`, `pill 9999`
- Motion tokens (`MOTION.entry`, `MOTION.tap`, etc.) for Reanimated springs
- Expressive typography scale

## Streaming chat

`ChatSessionScreen` calls the `STREAM_CHAT_MESSAGE` mutation to kick off a
stream and subscribes to `CHAT_STREAM` (`chatStream.${sessionId}`) to receive
AI tokens in real time. The BFF's `streamChatMessage` resolver opens a Groq
stream and publishes tokens via `graphql-redis-subscriptions`
(channel: `chatStream.${sessionId}`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run start` | Start Expo Dev Client (alias for `expo start`) |
| `npm run android` | `expo run:android` (build + launch native app) |
| `npm run ios` | `expo run:ios` |
| `npm run web` | Start as a web app (`expo start --web`) — useful for visual testing |
| `npm run build` | `expo export` (web export bundle) |
| `npm run build:android` | `eas build -p android` |
| `npm run build:ios` | `eas build -p ios` |
| `npm run submit:android` | `eas submit -p android` |
| `npm run submit:ios` | `eas submit -p ios` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .` (ESLint v10 flat config) |
| `npm run codegen` | `graphql-codegen --config codegen.ts` |

## EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --profile production --platform ios
eas build --profile production --platform android
```

Build profiles (from `eas.json`): `development` (dev client), `preview`
(internal), `production` (auto-incrementing), `production-apk` (APK variant).

## Troubleshooting

- **"Network request failed"** — The GraphQL URL is unreachable. Verify
  `EXPO_PUBLIC_GRAPHQL_HTTP_URL` and the BFF is running. On the Android
  emulator, replace `localhost` with `10.0.2.2`.
- **"Invalid login credentials"** — Google sign-in returned a token Supabase
  didn't accept. Check that the Web client ID matches between Google Cloud
  and Supabase.
- **Subscription never fires** — Make sure `EXPO_PUBLIC_GRAPHQL_WS_URL` is
  `wss://` in production, and the BFF's `CORS_ORIGINS` allows your origin.
- **Stale data** — Apollo cache is persisted to MMKV; clear app data to
  reset.
- **`Unable to resolve "../../App" from "node_modules/expo/AppEntry.js"`** —
  npm workspaces symlink `node_modules/@analogix/mobile` to the package
  dir, and Metro's `AppEntry.js` resolves relative to its own location.
  Fixed by `metro.config.js` + `index.ts` shim.
