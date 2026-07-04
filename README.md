# Analogix

> Why have 5 tabs open when one platform will do? With Analogix the Groq AI tutor, your Pomodoro timer, calendar and collaborative study rooms are all in one place. Spaced-repetition flashcards included. Everything is fed by the same API and your data is shared across the board.

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

## The story behind Analogix

We were of a mind to put an end to having too many tabs open. There was ChatGPT to get an explanation, Quizlet for the cards, Google Docs for notes, a standalone calendar for what is due and a Pomodoro timer on top of that — with nothing communicating with anything else. So we built a monorepo out of sheer irritation.

Analogix has the essentials for any student, high school or otherwise:

- **AI Tutor** — Backed by Groq it can explain things, put together a quiz or some flashcards to suit your interests. Handy for those last-minute pre-exam jitters.
- *Flashcards* — SM-2 spaced repetition. You can make your own or let the AI build a set from an uploaded file or a chat session.
- *Quizzes* — Multiple choice, essay, mixed. Timed or not. The AI will create them from your material.
- *Calendar* — View by day, week or month. We auto-calculate term dates for every Australian state and will import ICS from your school portal.
- *Timer* — A configurable Pomodoro to keep track of your sessions and streaks.
- **Study Schedule** — Let the AI put together a weekly plan based on your subjects and deadlines. Feel free to make adjustments.
- *Subjects* — For keeping tabs on marks, homework and the syllabus, plus a document editor.
- *Rooms* — For group work in real time. You get a shared chat, documents and a synced timer.
- *Formulas* — Subject-based formula sheets rendered in LaTeX and searchable.
- *Achievements* — Some gamification in the form of XP and badges to make the grind more palatable.
- **Assessment Guide** — Hand the AI an assessment PDF and it will draft a study plan.

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

Some details on how it is put together:

- There are no duplicate endpoints; the web and mobile apps use the same GraphQL API.
- We do not need custom auth as the server handles Supabase JWT verification.
- In development Redis will fall back to in-process PubSub, but in production it is what manages the subscriptions for room sync and chat streaming.
- Both clients pull their types and schemas from `@analogix/shared`. Make a change to a Zod schema and the rest of the apps follow suit.

---

## The Apps

| Package | Description | Tech stack |
|---------|-------------|------------|
| `AnalogixWeb` | Web client | Next.js 16, Turbopack and TypeScript |
| `AnalogixMobile` | Mobile app | React Native 0.81 on Expo SDK 54 with react-native-paper and Reanimated 4 |
| `AnalogixGraphQL` | BFF / GraphQL gateway | Apollo Server v5, Express 5, graphql-ws, Redis |
| `@analogix/shared` | Common types and schemas | TypeScript, Zod, JSON manifests |

---

## Getting started

```bash
# 1. Get the root and workspaces installed
npm install

# 2. Make a copy of the env templates and put in your secrets
cp AnalogixGraphQL/.env.example AnalogixGraphQL/.env
cp AnalogixMobile/.env.example AnalogixMobile/.env

# 3. Do a build on the shared package
npm run build:shared

# 4. Fire up the API (terminal 1)
npm run dev:api      # http://localhost:4000/graphql

# 5. For the web client (terminal 2)
npm run dev:web      # http://localhost:3000

# 6. And the mobile app (terminal 3)
npm run dev:mobile   # Expo dev server
```

---

## A note on environment variables

The following are required for each application:

**AnalogixGraphQL/.env** (Server runtime)
`PORT`, `NODE_ENV`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `GROQ_API_KEY_2`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DESMOS_API_KEY`, `REDIS_URL`, `LOG_LEVEL`

**AnalogixMobile/.env** (Client side)
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GRAPHQL_HTTP_URL`, `EXPO_PUBLIC_GRAPHQL_WS_URL`, `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME`

**AnalogixWeb/.env.local** (Next.js)
`GROQ_API_KEY`, `GROQ_API_KEY_2`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SITE_URL`, `DESMOS_API_KEY`, `ALLOW_DEV_API`

---

## Root level scripts

| Command | Function |
|---------|----------|
| `npm run dev` | Turbo will handle `dev` for all workspaces |
| `npm run dev:api` | To start the GraphQL BFF |
| `npm run dev:web` | Next.js dev server |
| `npm run dev:mobile` | Expo Dev Client |
| `npm run dev:shared` | Keep an eye on `@analogix/shared` |
| `npm run build` | Build all of them |
| `npm run build:shared` | Shared package first |
| `npm run typecheck` | `tsc --noEmit` in every workspace |
| `npm run lint` | Run ESLint |
| `npm run clean` | Clear out the build outputs |

---

## Further reading

For anything not covered here, refer to the individual READMEs in the sub-packages:

- [`AnalogixMobile/README.md`](./AnalogixMobile/README.md): Screenshots, the theming system, EAS builds and how auth works.
- [`AnalogixGraphQL/README.md`](./AnalogixGraphQL/README.md): Details on the schema, resolvers, deployment and so on.
- [`AnalogixWeb/README.md`](./AnalogixWeb/README.md): Setup for the web client, pages and some troubleshooting.

*Disclaimer: While AI has been of assistance in putting together this document and portions of the code, it has all been fact and bug-checked to provide the best experience.*
