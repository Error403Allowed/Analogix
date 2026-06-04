# AnalogixGraphQL

The BFF (Backend for Frontend) that powers **AnalogixMobile** and incrementally replaces
the REST API in **AnalogixWeb**. Built on Apollo Server v4 + Express + graphql-ws.

## Architecture

- **Apollo Server v4** with `expressMiddleware` (HTTP) + `useServer` from `graphql-ws` (subscriptions).
- **Per-request Supabase clients** scoped to the user's JWT (RLS enforced).
- **Redis-backed PubSub** for subscriptions (falls back to in-process when `REDIS_URL` is unset).
- **Groq** for AI completions (streaming + single-shot) and **OpenAlex + Crossref** for academic research.
- **pdf-parse + mammoth** for document text extraction.
- **ical.js** for calendar import.

## Endpoints

- `POST /graphql` — HTTP queries + mutations
- `GET  /graphql` — Playground / Apollo Sandbox (dev only)
- `WS   /graphql` — graphql-ws subscriptions
- `GET  /health`  — Liveness probe (`200 OK`)

## Setup

```bash
# from the monorepo root
npm install
npm run build:shared         # build the @analogix/shared package first
npm run dev:api              # start the BFF in dev mode
```

The server listens on port `4000` by default. Configure via `PORT` in `.env`.

## Environment variables

Copy `.env.example` to `.env` and fill in real values:

| Var | Required | Description |
| --- | --- | --- |
| `PORT` | no | Server port (default `4000`) |
| `NODE_ENV` | no | `development` \| `production` |
| `SUPABASE_URL` | **yes** | `https://YOUR-PROJECT-REF.supabase.co` |
| `SUPABASE_ANON_KEY` | **yes** | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Bypass RLS for admin operations |
| `GROQ_API_KEY_PRIMARY` | **yes** | Primary Groq key |
| `GROQ_API_KEY_FALLBACK` | no | Optional secondary |
| `GOOGLE_CLIENT_ID_WEB` | no | Google OAuth verification |
| `DESMOS_API_KEY` | no | Used by mobile for graph rendering (proxy) |
| `REDIS_URL` | no | `redis://...` — enables scaled subscriptions |
| `CORS_ORIGINS` | no | Comma-separated allowed origins (default `*` in dev) |

## Schema overview

| Type | Source | Notes |
| --- | --- | --- |
| `Query.me` | `user.ts` | Profile from `profiles` table |
| `Query.subjects` / `Query.subject` | `subject.ts` | Web-shaped notes + marks + mobile-facing `name`/`chapters` |
| `Query.studyMap` | `subject.ts` | Per-subject progress (mobile) |
| `Query.formulaSheets` | `formula.ts` | Hydrated from `@analogix/shared/formulas` |
| `Query.achievements` | `achievement.ts` | Hydrated from `@analogix/shared/achievements` |
| `Query.userStats` | `stats.ts` | Includes mobile `xp`/`level`/`memories` extensions |
| `Query.rooms` / `Query.room` | `room.ts` | Members, messages, documents via sub-resolvers |
| `Query.chatSessions` / `Query.chatMessages` | `chat.ts` | |
| `Query.flashcards` / `Query.flashcardSets` | `flashcard.ts` | SM-2 spaced repetition |
| `Query.quizzes` | `quiz.ts` | AI-generated via Groq |
| `Query.events` / `Query.deadlines` | `calendar.ts` | |
| `Query.documents` / `Query.document` | `document.ts` | |
| `Query.resources` | `resource.ts` | Supabase storage |
| `Subscription.chatStream` | `chat.ts` | Real AI token streaming |
| `Subscription.roomMessagesStream` | `room.ts` | Live chat in rooms |
| `Subscription.roomPresenceStream` | `room.ts` | Online status |
| `Subscription.roomTimerStream` | `room.ts` | Pomodoro state sync |

## Auth flow

1. Mobile app signs in via Supabase JS client (Google OAuth).
2. The Supabase access token is attached to every HTTP request as `Authorization: Bearer <token>` and to every WS connection via `connectionParams`.
3. `src/auth/verifyToken.ts` verifies the JWT against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` using `jose.jwtVerify`.
4. The verified user is attached to the GraphQL context (`ctx.user`), and a per-request Supabase client is created with that token so RLS applies.

## Deploy to Fly.io

```bash
# 1. Install the fly CLI: https://fly.io/docs/hands-on/install-flyctl/
# 2. Launch the app (one-time, picks region and creates app)
fly launch --no-deploy

# 3. Set all secrets (NEVER commit .env)
fly secrets set \
  SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
  SUPABASE_ANON_KEY=YOUR-ANON-KEY \
  SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY \
  GROQ_API_KEY_PRIMARY=YOUR-GROQ-KEY \
  GOOGLE_CLIENT_ID_WEB=YOUR-GOOGLE-CLIENT-ID \
  REDIS_URL=redis://default:YOUR-PASSWORD@YOUR-REDIS-UPSTASH.flycast:6379

# 4. Deploy
fly deploy

# 5. Verify
fly open
curl https://YOUR-APP.fly.dev/health
```

The Dockerfile is multi-stage; the runtime image is `node:20-bookworm-slim` (matches
`AnalogixWeb`'s `engines.node: ">=20 <27"`).

## Project layout

```
AnalogixGraphQL/
├── Dockerfile
├── fly.toml
├── package.json
├── tsconfig.json
└── src/
    ├── server.ts                # Apollo + Express + graphql-ws entry
    ├── env.ts                   # zod-validated env loader
    ├── context.ts               # per-request GraphQL context
    ├── pubsub.ts                # Redis or in-process PubSub
    ├── auth/
    │   └── verifyToken.ts       # jose-based Supabase JWT verification
    ├── supabase.ts              # service-role + getUserClient helpers
    ├── logger.ts                # pino
    ├── ai/
    │   ├── groq.ts              # callGroqChat + streamGroqChat
    │   ├── extractText.ts       # pdf-parse + mammoth
    │   ├── research.ts          # OpenAlex + Crossref
    │   └── ics.ts               # ical.js parser
    ├── schema/                  # 14 SDL files, merged into index
    └── resolvers/               # matching resolvers
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start in dev mode with `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled output |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `tsc` with strict checks (no eslint config yet) |

## Troubleshooting

- **Subscriptions drop immediately** — Check that `CORS_ORIGINS` includes your client origin, and that the BFF URL is `wss://` (not `ws://`) in production.
- **"Missing authorization header"** — The Supabase access token is not being attached. Verify `apollo/client.ts` on the device side reads the token from `AuthContext`.
- **"Row not found" on Supabase queries** — The user is authenticated, but the row is owned by a different user. RLS is working correctly.
- **Groq 429** — Rate limited; add a `GROQ_API_KEY_FALLBACK` and the resolver will retry on the next request.
