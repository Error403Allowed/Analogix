# Analogix

> AI-powered study platform for Australian secondary students (Years 7–12).

![Platform](https://img.shields.io/badge/platform-web%20%7C%20mobile%20%7C%20api-6366f1)
![Node](https://img.shields.io/badge/node-%3E%3D22%20%3C27-339933)
![npm](https://img.shields.io/badge/npm-%3E%3D11-CC3534)

---

## Screenshots

| Mobile Dashboard | Chat | Flashcards | Web Dashboard |
|:---:|:---:|:---:|:---:|
| `screenshots/mobile-dashboard.png` | `screenshots/mobile-chat.png` | `screenshots/mobile-flashcards.png` | `screenshots/web-dashboard.png` |
| | | | |
| Study Hub | Calendar | Timer | Quiz |
| `screenshots/mobile-studyhub.png` | `screenshots/mobile-calendar.png` | `screenshots/mobile-timer.png` | `screenshots/mobile-quiz.png` |

---

## What is Analogix?

Analogix replaces scattered study tools (ChatGPT, Google Docs, Quizlet, Pomodoro timers) with **one unified platform** that includes:

- **AI Tutor** — Chat with Groq-powered AI that explains concepts, generates quizzes/flashcards, and adapts explanations to your interests.
- **Flashcards** — Spaced repetition (SM-2) with AI-generated sets from any text or chat conversation.
- **Quizzes** — Timed/untimed, multiple-choice/essay/mixed, AI-generated from your study materials.
- **Calendar** — Month/week/day view with term dates, deadlines, ICS import, and event management.
- **Timer** — Pomodoro with custom durations, session tracking, and streak counting.
- **Study Schedule** — Automatic weekly study plan generated from your subjects and upcoming assessments.
- **Subjects** — Syllabus tracking, marks, homework, and document editor per subject.
- **Rooms** — Real-time collaborative study rooms with chat, documents, and a shared timer.
- **Formulas** — LaTeX-rendered formula sheets organized by subject.
- **Achievements** — Gamified XP, levels, and unlockable achievements.
- **Assessment Guide** — Step-by-step guide for tackling different assessment types with AI assistance.

---

## Architecture

```
                    ┌───────────────────────┐
                    │    AnalogixWeb         │
                    │  Next.js 16 + Turbopack │
                    │  REST + GraphQL client  │
                    └────────┬──────────────┘
                             │ HTTP/WS
                    ┌────────▼──────────────┐
                    │   AnalogixGraphQL      │
                    │  Apollo Server v5      │◄──── Supabase Auth (JWT)
                    │  Express 5 + graphql-ws│      Groq AI, OpenAlex
                    │  Redis PubSub          │      Supabase DB/Storage
                    └────────┬──────────────┘
                             │ HTTP/WS
                    ┌────────▼──────────────┐
                    │    AnalogixMobile      │
                    │  Expo SDK 54 + RN 0.81 │
                    │  Material 3 Expressive │
                    └───────────────────────┘
```

**Key points:**
- Web and mobile both call the same GraphQL API
- The GraphQL server authenticates via Supabase JWTs
- Redis handles real-time subscription fan-out (chat streaming, room sync)
- All three apps share `@analogix/shared` (types, Zod schemas, curriculum data)

---

## Apps

| Package | Description | Tech |
|---------|-------------|------|
| `AnalogixWeb` | Web client | Next.js 16, Turbopack, TypeScript |
| `AnalogixMobile` | Mobile app | Expo SDK 54, React Native 0.81, react-native-paper, Reanimated 4 |
| `AnalogixGraphQL` | BFF API | Apollo Server v5, Express 5, graphql-ws, Redis |
| `@analogix/shared` | Shared package | TypeScript, Zod, JSON manifests |

---

## Quick start

```bash
# 1. Install root + all workspaces
npm install

# 2. Copy env templates and fill in secrets
cp AnalogixGraphQL/.env.example AnalogixGraphQL/.env
cp AnalogixMobile/.env.example AnalogixMobile/.env

# 3. Build the shared package
npm run build:shared

# 4. Start the API (in terminal 1)
npm run dev:api      # http://localhost:4000/graphql

# 5. Start the web client (in terminal 2)
npm run dev:web      # http://localhost:3000

# 6. Start the mobile app (in terminal 3)
npm run dev:mobile   # Expo dev server
```

---

## Where secrets live

| App | File | What goes there |
|-----|------|----------------|
| `AnalogixGraphQL/.env` | Server runtime | `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `GROQ_API_KEY_2`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DESMOS_API_KEY`, `REDIS_URL`, `LOG_LEVEL` |
| `AnalogixMobile/.env` | Bundled into client | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GRAPHQL_HTTP_URL`, `EXPO_PUBLIC_GRAPHQL_WS_URL`, `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME` |
| `AnalogixWeb/.env.local` | Next.js (web) | `GROQ_API_KEY`, `GROQ_API_KEY_2`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SITE_URL`, `DESMOS_API_KEY`, `ALLOW_DEV_API` |

---

## Root scripts

| Script | What it does |
|--------|-------------|
| `npm run dev` | Run `dev` across all workspaces via Turbo |
| `npm run dev:api` | Start the GraphQL BFF |
| `npm run dev:web` | Start Next.js dev server |
| `npm run dev:mobile` | Start Expo Dev Client |
| `npm run dev:shared` | Watch the `@analogix/shared` package |
| `npm run build` | Build every workspace |
| `npm run build:shared` | Build the shared package first |
| `npm run typecheck` | `tsc --noEmit` across all workspaces |
| `npm run lint` | ESLint across all workspaces |
| `npm run clean` | Remove all build outputs |

---

## See also

- [`AnalogixMobile/README.md`](./AnalogixMobile/README.md) — Full mobile app docs, screenshots, theming, auth, EAS builds
- [`AnalogixGraphQL/README.md`](./AnalogixGraphQL/README.md) — API schema, resolvers, auth flow, Fly.io deployment
- [`AnalogixWeb/README.md`](./AnalogixWeb/README.md) — Web client setup, Vercel deployment
