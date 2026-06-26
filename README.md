# Analogix

> One platform instead of 5 different tabs. Groq AI tutor, spaced-repetition flashcards, Pomodoro timer, calendar, collaborative study rooms — all talking to the same API, all sharing your data.

![Platform](https://img.shields.io/badge/platform-web%20%7C%20mobile%20%7C%20api-6366f1)
![Node](https://img.shields.io/badge/node-%3E%3D22%20%3C27-339933)
![npm](https://img.shields.io/badge/npm-%3E%3D11-CC3534)

---

## Screenshots

| Mobile Dashboard | Chat | Web Dashboard |
|:---:|:---:|:---:|
| ![Mobile Dashboard](screenshots/mobile-dashboard.png) | ![Chat](screenshots/mobile-chat.png) | ![Web Dashboard](screenshots/web-dashboard.png) |
| Study Hub | Calendar | Timer |
| ![Study Hub](screenshots/mobile-studyhub.png) | ![Calendar](screenshots/mobile-calendar.png) | ![Timer](screenshots/mobile-timer.png) |
| Quiz | | |
| ![Quiz](screenshots/mobile-quiz.png) | | |

---

## What is Analogix?

We had too many tabs open. ChatGPT for explaining things, Quizlet for flashcards, a Pomodoro timer, Google Docs for notes, a separate calendar for deadlines — none of it talked to each other. Analogix is the result of getting annoyed enough to build a monorepo.

It covers the main stuff a high school student (or honestly anyone studying) needs:

- **AI Tutor** — Groq-powered. Explains concepts, generates quizzes and flashcards, adapts to your interests. Also works great for last-minute exam panic.
- **Flashcards** — Spaced repetition (SM-2). The AI generates sets from chat conversations or uploaded files, or you can make your own.
- **Quizzes** — Timed or untimed, multiple choice or essay or mixed. AI generates them from whatever you're studying.
- **Calendar** — Month/week/day views. Auto-calculates term dates per Australian state. Imports ICS files from school portals.
- **Timer** — Pomodoro. Configurable focus/break durations. Tracks sessions and streaks.
- **Study Schedule** — AI generates a weekly plan from your subjects and upcoming deadlines. You can tweak it.
- **Subjects** — Per-subject syllabus tracking, marks, homework assignments, and a document editor.
- **Rooms** — Real-time study rooms for group work. Shared chat, collaborative documents, synced Pomodoro timer.
- **Formulas** — LaTeX-rendered formula sheets organized by subject with full-text search.
- **Achievements** — XP, levels, and unlockable badges to gamify the grind.
- **Assessment Guide** — Upload an assessment notification PDF and get an AI-generated study plan.

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

A few notes on how this fits together:

- Web and mobile hit the same GraphQL API. No duplicate endpoints.
- The GraphQL server verifies Supabase JWTs — no custom auth.
- Redis handles real-time subscriptions (chat streaming, room state sync). Falls back to in-process PubSub in dev.
- All three apps share types and schemas through `@analogix/shared`. Change a Zod schema there and both clients pick it up.

---

## Apps

| Package | What it is | Stack |
|---------|-----------|-------|
| `AnalogixWeb` | Web client | Next.js 16, Turbopack, TypeScript |
| `AnalogixMobile` | Mobile app | Expo SDK 54, React Native 0.81, react-native-paper, Reanimated 4 |
| `AnalogixGraphQL` | BFF / GraphQL gateway | Apollo Server v5, Express 5, graphql-ws, Redis |
| `@analogix/shared` | Shared types and schemas | TypeScript, Zod, JSON manifests |

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

## Environment variables by app

| App | File | The env vars it needs |
|-----|------|----------------------|
| `AnalogixGraphQL/.env` | Server runtime | `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `GROQ_API_KEY_2`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DESMOS_API_KEY`, `REDIS_URL`, `LOG_LEVEL` |
| `AnalogixMobile/.env` | Bundled into client | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GRAPHQL_HTTP_URL`, `EXPO_PUBLIC_GRAPHQL_WS_URL`, `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME` |
| `AnalogixWeb/.env.local` | Next.js (web) | `GROQ_API_KEY`, `GROQ_API_KEY_2`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SITE_URL`, `DESMOS_API_KEY`, `ALLOW_DEV_API` |

---

## Root scripts

| Script | Does what |
|--------|----------|
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

## More docs

Each sub-package has its own README with more detail:

- [`AnalogixMobile/README.md`](./AnalogixMobile/README.md) — Mobile app screenshots, theming system, auth flow, EAS builds
- [`AnalogixGraphQL/README.md`](./AnalogixGraphQL/README.md) — Full schema, resolver structure, auth, deployment notes
- [`AnalogixWeb/README.md`](./AnalogixWeb/README.md) — Web client setup, pages, API endpoints, troubleshooting
