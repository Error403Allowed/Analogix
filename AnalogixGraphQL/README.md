# AnalogixGraphQL

The BFF (Backend for Frontend) that powers **AnalogixMobile** and incrementally
replaces the REST API in **AnalogixWeb**. Built on **Apollo Server v5** + Express 5 + `graphql-ws`.

## Architecture

- **Apollo Server v5** with `expressMiddleware` from `@as-integrations/express5` (HTTP) + `useServer` from `graphql-ws` (subscriptions).
- **Per-request Supabase clients** scoped to the user's JWT (RLS enforced).
- **Redis-backed PubSub** for subscriptions (falls back to in-process `graphql-subscriptions.PubSub` when `REDIS_URL` is unset; in prod, Redis is strongly recommended for horizontal scaling).
- **Groq** for AI completions (streaming + single-shot) and **OpenAlex + Crossref** for academic research.
- **pdf-parse + mammoth** for document text extraction.
- **ical.js** for calendar import.
- **JWT verification** against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` using `jose.jwtVerify`.

## Endpoints

- `POST /graphql` — HTTP queries + mutations
- `GET  /graphql` — Apollo Sandbox (dev only — introspection is disabled in production)
- `WS   /graphql` — `graphql-ws` subscriptions
- `GET  /health`  — Liveness probe (`200 OK`, returns `{ status, timestamp }`)
- `GET  /`        — Landing JSON (name, version, endpoint URLs)

## Setup

```bash
# from the monorepo root
npm install
npm run build:shared         # build the @analogix/shared package first
cp AnalogixGraphQL/.env.example AnalogixGraphQL/.env
# …fill in real values…
npm run dev:api              # start the BFF in dev mode
```

The server listens on port `4000` by default. Configure via `PORT` in `.env`.

## Environment variables

Copy `.env.example` to `.env` and fill in real values:

| Var | Required | Description |
| --- | --- | --- |
| `PORT` | no | Server port (default `4000`) |
| `NODE_ENV` | no | `development` \| `production` |
| `CORS_ORIGINS` | no | Comma-separated allowed origins (default `http://localhost:3000`). Set to your web + mobile origins in dev. |
| `SUPABASE_URL` | **yes** | `https://YOUR-PROJECT-REF.supabase.co` |
| `SUPABASE_ANON_KEY` | **yes** | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Bypass RLS for admin operations |
| `GROQ_API_KEY` | **yes** | Primary Groq key |
| `GROQ_API_KEY_2` | no | Optional secondary key for soft rate-limit failover |
| `GOOGLE_CLIENT_ID` | no | Google OAuth client ID (Web) |
| `GOOGLE_CLIENT_SECRET` | no | Google OAuth client secret |
| `DESMOS_API_KEY` | no | Used by mobile for graph rendering (proxy) |
| `REDIS_URL` | no | `redis://...` or `rediss://...` (Upstash). Enables horizontally-scaled subscriptions. Empty → in-process PubSub (dev only). |
| `LOG_LEVEL` | no | pino log level (default `info`) |

## Schema overview

| Field | Resolver | Notes |
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
| `Subscription.chatStream` | `chat.ts` | Real AI token streaming (channel `chatStream.${sessionId}`) |
| `Subscription.roomMessagesStream` | `room.ts` | Live chat in rooms |
| `Subscription.roomPresenceStream` | `room.ts` | Online status |
| `Subscription.roomTimerStream` | `room.ts` | Pomodoro state sync |

## Auth flow

1. Mobile app signs in via Supabase JS client (Google OAuth via `expo-auth-session`).
2. The Supabase access token is attached to every HTTP request as `Authorization: Bearer <token>` and to every WS connection via `connectionParams.Authorization` (or `?token=` query param as a WebView fallback).
3. `src/auth/verifyToken.ts` verifies the JWT against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` using `jose.jwtVerify` (issuer = `${SUPABASE_URL}/auth/v1`, audience = `authenticated`).
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
  GROQ_API_KEY=YOUR-GROQ-KEY \
  GROQ_API_KEY_2=YOUR-OPTIONAL-SECONDARY-KEY \
  GOOGLE_CLIENT_ID=YOUR-GOOGLE-CLIENT-ID \
  GOOGLE_CLIENT_SECRET=YOUR-GOOGLE-CLIENT-SECRET \
  DESMOS_API_KEY=YOUR-DESMOS-KEY \
  REDIS_URL=rediss://default:YOUR-PASSWORD@YOUR-REDIS-UPSTASH.flycast:6379

# 4. Deploy
fly deploy

# 5. Verify
fly open
curl https://YOUR-APP.fly.dev/health
```

The Dockerfile is multi-stage on `node:22-bookworm-slim`; the runtime image
copies only the compiled `dist/` directories from the shared package and the
BFF. The Fly app's region is `syd` (see `fly.toml`).

## Project layout

```
AnalogixGraphQL/
├── Dockerfile                 # multi-stage, node:22-bookworm-slim
├── fly.toml                   # Fly.io app config (region: syd, port 4000)
├── package.json
├── tsconfig.json
└── src/
    ├── server.ts              # Apollo + Express + graphql-ws entry
    ├── env.ts                 # zod-validated env loader (fail-fast on missing)
    ├── context.ts             # per-request GraphQL context (user + supabase + pubsub)
    ├── pubsub.ts              # Redis or in-process PubSub
    ├── logger.ts              # pino logger
    ├── supabase.ts            # service-role client + per-request user-client factory
    ├── auth/
    │   └── verifyToken.ts     # jose-based Supabase JWT verification
    ├── ai/
    │   ├── groq.ts            # Groq completions + streaming
    │   ├── extractText.ts     # pdf-parse + mammoth
    │   ├── research.ts        # OpenAlex + Crossref
    │   └── ics.ts             # ical.js parser
    ├── schema/                # 14 SDL files, merged in index.ts
    ├── resolvers/             # matching resolvers + scalars + _helpers
    ├── datasources/           # (reserved for future DataLoader-backed sources)
    ├── types/                 # internal GraphQL types
    └── utils/                 # misc helpers
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start in dev mode with `tsx watch src/server.ts` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled output (`node dist/server.js`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Placeholder (`echo 'lint placeholder'`) — no ESLint config yet |
| `npm run codegen` | Run `graphql-codegen` against `codegen.ts` |

## Troubleshooting

- **Subscriptions drop immediately** — Check that `CORS_ORIGINS` includes your client origin, and that the BFF URL is `wss://` (not `ws://`) in production.
- **"Missing authorization header"** — The Supabase access token is not being attached. On the client, verify `apollo/client.ts` reads the token from `AuthContext` and adds it to both HTTP + WS links.
- **"Row not found" on Supabase queries** — The user is authenticated, but the row is owned by a different user. RLS is working correctly.
- **Groq 429** — Rate limited; set `GROQ_API_KEY_2` and the resolver will retry on the next request.
- **WebSocket fails to connect behind a corporate proxy** — `graphql-ws` requires the `Sec-WebSocket-Protocol` and `Connection: Upgrade` headers. Make sure no middleware strips them.
