# Analogix

> AI-powered study platform for Australian secondary students (Years 7–12).

> **⚠️ Showcase repo** — This is a curated public snapshot of the Analogix platform. It includes UI components, type definitions, and architecture docs to demonstrate the product. The full source code (resolvers, AI prompts, API routes, auth flow, database schemas) is kept in a private repository. For questions or access, please [open an issue](https://github.com/Error403Allowed/Analogix/issues) or contact the maintainer.

![Platform](https://img.shields.io/badge/platform-web%20%7C%20mobile%20%7C%20api-6366f1)
![Node](https://img.shields.io/badge/node-%3E%3D22%20%3C27-339933)
![npm](https://img.shields.io/badge/npm-%3E%3D11-CC3534)

---

## Screenshots

| Mobile Dashboard | Chat | Web Dashboard |
|:---:|:---:|:---:|
| `screenshots/mobile-dashboard.png` | `screenshots/mobile-chat.png` | `screenshots/web-dashboard.png` |
| Study Hub | Calendar | Timer |
| `screenshots/mobile-studyhub.png` | `screenshots/mobile-calendar.png` | `screenshots/mobile-timer.png` |

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

## Repo contents

| Directory | What's here |
|-----------|-------------|
| [`web/`](./web/) | Web app UI components, page views, type definitions, and curriculum/formula data |
| [`mobile/`](./mobile/) | Mobile app UI components, screen layouts, theming system, and navigation |
| [`shared/`](./shared/) | Shared TypeScript type definitions |
| [`screenshots/`](./screenshots/) | Platform screenshots |
| [`configs/`](./configs/) | Build and infrastructure configs |

The full project also includes a GraphQL API (Apollo Server v5), AI prompt engine, auth flow, database migrations, and real-time collaboration backend — all kept in a private repository.

---

## See also

- [`AnalogixMobile/README.md`](./mobile/README.md) — Full mobile app docs, screenshots, theming, auth, EAS builds
- [`AnalogixWeb/README.md`](./web/README.md) — Web client setup, Vercel deployment
- [`shared/README.md`](./shared/README.md) — Shared types and data manifests
