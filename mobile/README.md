# AnalogixMobile

> **ℹ️ Showcase** — UI components and screens from the Analogix React Native mobile client. The GraphQL queries, auth flow, and API configuration are not included here.

> React Native + Expo + Material 3 Expressive mobile client for Analogix.

![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54-000020)
![RN](https://img.shields.io/badge/React%20Native-0.81-61DAFB)
![Paper](https://img.shields.io/badge/react--native--paper-5-6750A4)

---

## Screenshots

| Home Dashboard | AI Chat | Study Hub |
|:---:|:---:|:---:|
| `../screenshots/mobile-dashboard.png` | `../screenshots/mobile-chat.png` | `../screenshots/mobile-studyhub.png` |
| Streak & Timer widget, quick actions | ChatGPT-inspired streaming chat | 7 tool cards |
| | | |
| **Flashcards** | **Quiz** | **Calendar** |
| `../screenshots/mobile-flashcards.png` | `../screenshots/mobile-quiz.png` | `../screenshots/mobile-calendar.png` |
| Spaced repetition + AI generation | Timed/mixed/essay modes | Month/week/day views |
| | | |
| **Timer** | | |
| `../screenshots/mobile-timer.png` | | |
| Pomodoro with session tracking | | |

---

## Features

### AI Tutor
- Streaming chat via Groq (real-time token-by-token responses)
- ChatGPT-inspired UI with Gemini-style model selector, right-aligned user bubbles, full-width assistant messages
- Subject-aware conversations (pick a subject to scope the AI)
- Research mode (auto-fetches sources from OpenAlex + Crossref)
- Analogy mode (anchors explanations to your hobbies)
- Re-explain with different anchor points
- Code execution (Python via Pyodide in WebView)
- Markdown rendering with LaTeX, syntax highlighting, and code blocks
- File uploads (PDF, DOCX, images with text extraction)

### Flashcards
- Spaced repetition with SM-2 algorithm
- AI-generated from any text, chat conversation, or uploaded file
- Flashcard sets organized by subject
- Star/flag for difficult cards

### Quizzes
- Multiple choice, essay, and mixed question types
- Timed and untimed modes
- AI-generated from your study materials or files
- Detailed results with review

### Calendar
- Month, week, day, and schedule views
- Term dates auto-calculated per Australian state
- ICS file import
- Events + homework deadlines
- Custom event types with color coding

### Timer (Pomodoro)
- Customizable focus / break / long break durations
- Session tracking with streak counter
- Phase-aware color transitions (focus → brand, break → green)
- Auto-advance through sessions

### Study Hub
- Landing page with 7 tool cards: Flashcards, Quiz, Calendar, Formulas, Timer, Study Schedule, Assessment Guide
- Quick access to every study tool from one place

### Study Schedule
- AI-generated weekly study plan based on your subjects and upcoming assessments
- Adjustable schedule

### Formulas
- LaTeX-rendered formula sheets by subject
- Full-text search across all subjects
- Categorized by topic

### Subjects
- Subject management with syllabus tracking
- Marks and grade calculations
- Homework assignments
- Document editor with file attachments
- Study map for progress tracking

### Rooms
- Real-time collaborative study rooms
- Live chat with `graphql-ws` subscriptions
- Shared document workspace
- Synchronized Pomodoro timer
- Presence indicators (who's online)

### Achievements
- 30+ unlockable achievements across starter, streak, mastery, and social categories
- XP and leveling system
- Progress tracking per category

### Theme
- 5 brand color schemes: Cosmic (default), Paper, Sunrise, Forest, Rose
- Dynamic Material 3 color generation from seed colors
- Slate monochrome theme (Notion-like greyscale)
- Light + dark mode with system follow
- Custom shape scale (xl 28dp, xxl 36dp, pill 9999)
- Reanimated spring motion tokens

---

## Tech Stack

| Category | Libraries |
|----------|-----------|
| **Framework** | Expo SDK 54, React Native 0.81, React 19.1, New Architecture enabled |
| **UI** | react-native-paper v5, Reanimated 4, Material Design Icons |
| **GraphQL** | Apollo Client (HTTP + graphql-ws subscriptions) |
| **Auth** | Supabase JS + expo-auth-session (PKCE Google OAuth) |
| **Storage** | react-native-mmkv (cache + secure token storage) |
| **Animations** | react-native-reanimated 4, react-native-worklets |
| **Math** | react-native-math-view (LaTeX rendering) |
| **Vector** | react-native-svg, react-native-vector-icons (per-family) |
| **Maps** | react-native-maps |
| **Audio** | expo-av (TTS read-aloud) |

---

## Screens & Navigation

6 bottom tabs: **Home**, **Tutor**, **Study**, **Subjects**, **Rooms**, **Profile**

- Custom `MaterialTabBar` with spring-scaled pill indicator (M3 Expressive)
- Auth gate: when unauthenticated, only `Login` + `Onboarding` are mounted
- Native stack transitions (`slide_from_right`)
- Root-level modal routes: `Login`, `Onboarding`, `Terms`, `PrivacyPolicy`

Full route param list in `src/navigation/types.ts`.

---

## GraphQL Backend

All data flows through `AnalogixGraphQL` at `http://localhost:4000/graphql`:

- **Queries** — `me`, `subjects`, `chatSessions`, `chatMessages`, `flashcards`, `quizzes`, `events`, `deadlines`, `rooms`, `formulaSheets`, `achievements`, `userStats`, `documents`, `resources`
- **Mutations** — `streamChatMessage` (triggers AI stream), `createChatSession`, `createFlashcardSet`, `generateFlashcards`, `generateQuiz`, `createEvent`, `addDeadline`, `createRoom`, etc.
- **Subscriptions** — `chatStream` (real-time AI tokens), `roomMessagesStream`, `roomPresenceStream`, `roomTimerStream`

See [`AnalogixGraphQL/README.md`](../AnalogixGraphQL/README.md) for the full schema.

---

## Theme System

```
ThemeContext
├── brand scheme (Cosmic / Paper / Sunrise / Forest / Rose)
├── dynamic M3 colors (material-color-utilities)
├── light/dark mode
├── shape tokens (sm → pill)
├── motion tokens (Entry, Tap, Exit springs)
└── persisted to MMKV (analogix.theme)
```

Each brand has a seed color that generates a full M3 palette. The Slate theme detects low-chroma seeds (chroma < 10) and produces pure monochrome surfaces.

---

## Auth Flow (PKCE Google OAuth)

1. User taps "Continue with Google"
2. `supabase.auth.signInWithOAuth()` returns a Google authorization URL
3. URL opens in `WebBrowser.openAuthSessionAsync()` (system browser)
4. Google redirects to `analogix://auth/callback` with an auth code
5. Code is extracted and exchanged via `supabase.auth.exchangeCodeForSession()`
6. Supabase returns session tokens → stored in MMKV via Supabase JS

On web fallback: redirect-based implicit flow (no `expo-web-browser`).

---

## Streaming AI Chat

```
User types message
  → STREAM_CHAT_MESSAGE mutation (Apollo HTTP)
  → GraphQL server calls Groq API with streaming
  → Groq tokens published via Redis PubSub (channel: chatStream.${sessionId})
  → Mobile receives tokens via CHAT_STREAM subscription (graphql-ws)
  → Real-time display in MarkdownRenderer
  → On done: token, message persisted to DB, UI updates with refetch
```

---

## Project Layout

```
AnalogixMobile/
├── app.json                    # Expo config
├── eas.json                    # EAS build profiles
├── index.ts                    # Entry → registerRootComponent(Main)
├── Main.tsx                    # Root: providers + navigation
├── assets/                     # Icon, splash, adaptive-icon
└── src/
    ├── config.ts               # EXPO_PUBLIC_* env (single source of truth)
    ├── supabase.ts             # Supabase JS client (MMKV-backed session)
    ├── apollo/                 # Apollo Client (HTTP + WS + auth)
    ├── context/                # AuthContext, TourContext, ThemeContext
    ├── graphql/queries/        # All GraphQL operations
    ├── hooks/                  # usePythonExecution, useTextToSpeech, useAchievementChecker, …
    ├── navigation/             # RootNavigator + MaterialTabBar + types
    ├── components/             # Icon, MarkdownRenderer, ThinkingBlock, ChatQuickActions, …
    ├── screens/
    │   ├── auth/               # Login, Onboarding, Terms, PrivacyPolicy
    │   ├── dashboard/          # Dashboard, Achievements
    │   ├── chat/               # ChatList, ChatSession (ChatGPT-style)
    │   ├── study/              # StudyHub, Flashcards, Quiz, Calendar, Formulas, Timer, Schedule, AssessmentGuide
    │   ├── subjects/           # SubjectsList, SubjectDetail, DocumentEditor
    │   ├── rooms/              # RoomsList, RoomDetail
    │   └── profile/            # Profile, Settings, ThemePicker, PersonalityEditor, MemoryManager, Support, Privacy
    ├── theme/                  # M3 Expressive theme + tokens
    ├── shared/                 # Cross-screen utilities
    ├── storage/                # MMKV helpers
    ├── types/                  # App-level TypeScript types
    └── utils/                  # parseThinkingBlock, termData, …
```

---

## Setup

```bash
# From the monorepo root
npm install
npm run build:shared
cp AnalogixMobile/.env.example AnalogixMobile/.env
# Fill in real values
npm run dev:mobile
```

Starts Expo Dev Client on port `8081`. Scan the QR code with the dev build app, or press `i` for iOS simulator.

---

## EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure

# Development build (dev client)
eas build --profile development --platform ios
eas build --profile development --platform android

# Production build
eas build --profile production --platform ios
eas build --profile production --platform android
```

Build profiles (from `eas.json`): `development` (dev client), `preview` (internal), `production` (auto-incrementing).

---

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run start` | Start Expo Dev Client |
| `npm run android` | `expo run:android` |
| `npm run ios` | `expo run:ios` |
| `npm run web` | `expo start --web` (visual testing) |
| `npm run build` | `expo export` |
| `npm run build:android` | `eas build -p android` |
| `npm run build:ios` | `eas build -p ios` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .` (ESLint v10 flat config) |
| `npm run codegen` | `graphql-codegen` |

---

## Troubleshooting

- **"Network request failed"** — GraphQL URL unreachable. Verify `EXPO_PUBLIC_GRAPHQL_HTTP_URL` and the BFF is running. On Android emulator, use `10.0.2.2` instead of `localhost`.
- **"Invalid login credentials"** — Web client ID mismatch between Google Cloud and Supabase.
- **Subscription never fires** — Ensure `EXPO_PUBLIC_GRAPHQL_WS_URL` is `wss://` in production, and CORS origins allow your client.
- **Stale data** — Apollo cache is persisted to MMKV; clear app data to reset.
- **Dev build can't load bundle** — Run `npx expo start --dev-client --tunnel --clear` (requires `@expo/ngrok`). Metro may not be reachable over LAN.
