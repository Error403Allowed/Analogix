# AnalogixGraphQL

> Apollo Server v5 BFF — single GraphQL gateway for Analogix web + mobile.

![Apollo](https://img.shields.io/badge/Apollo%20Server-5-311C87)
![Express](https://img.shields.io/badge/Express-5-000000)
![graphql-ws](https://img.shields.io/badge/graphql--ws-subscriptions-E10098)

---

## Architecture

- **Apollo Server v5** with `expressMiddleware` from `@as-integrations/express5` (HTTP) + `useServer` from `graphql-ws` (subscriptions).
- **Apollo Sandbox** embedded in dev mode — visit `http://localhost:4000/graphql` to explore the schema, write queries, and test mutations.
- **Per-request Supabase clients** scoped to the user's JWT (RLS enforced).
- **Redis-backed PubSub** for subscriptions. Falls back to in-process `graphql-subscriptions.PubSub` when `REDIS_URL` is unset (dev only).
- **Groq** for AI completions (streaming + single-shot) with secondary key failover.
- **OpenAlex + Crossref** for academic research source retrieval.
- **pdf-parse + mammoth** for document text extraction.
- **JWT verification** against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` using `jose.jwtVerify`.

---

## Endpoints

| Endpoint | Protocol | Purpose |
|----------|----------|---------|
| `POST /graphql` | HTTP | Queries + mutations |
| `GET /graphql` | HTTP | Apollo Sandbox Explorer (dev only) |
| `WS /graphql` | WebSocket | `graphql-ws` subscriptions |
| `GET /health` | HTTP | Liveness probe |
| `GET /` | HTTP | Landing JSON (name, version, URLs) |

---

## Setup

```bash
# From the monorepo root
npm install
npm run build:shared
cp AnalogixGraphQL/.env.example AnalogixGraphQL/.env
# Fill in real values, then:
npm run dev:api
```

Server starts on port `4000`. Open `http://localhost:4000/graphql` for the Apollo Sandbox.

---

## Environment Variables

| Var | Required | Default | Description |
|-----|----------|---------|-------------|
| `PORT` | no | `4000` | Server port |
| `NODE_ENV` | no | `development` | `development` / `production` |
| `CORS_ORIGINS` | no | `http://localhost:3000` | Comma-separated allowed origins |
| `SUPABASE_URL` | yes | — | `https://YOUR-PROJECT.supabase.co` |
| `SUPABASE_ANON_KEY` | yes | — | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | — | Bypass RLS for admin ops |
| `GROQ_API_KEY` | yes | — | Primary Groq key |
| `GROQ_API_KEY_2` | no | — | Secondary key (soft rate-limit failover) |
| `GOOGLE_CLIENT_ID` | no | — | Web OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | no | — | Web OAuth client secret |
| `DESMOS_API_KEY` | no | — | Desmos graphing API |
| `REDIS_URL` | no | — | `redis://` or `rediss://`. Empty → in-process PubSub |
| `LOG_LEVEL` | no | `info` | pino log level |

---

## Schema

### Queries

| Field | Description |
|-------|-------------|
| `me` | Current user profile from `profiles` table |
| `subjects` / `subject` | Subjects with notes, marks, chapters |
| `studyMap` | Per-subject progress |
| `formulaSheets` | LaTeX formulas by subject (from `@analogix/shared`) |
| `achievements` | Achievement catalog + user progress |
| `userStats` | XP, level, streak, memories |
| `rooms` / `room` | Collaborative study rooms with members + messages |
| `chatSessions` / `chatMessages` | AI chat sessions and messages |
| `flashcards` / `flashcardSets` | Spaced repetition flashcards |
| `quizzes` | AI-generated quizzes |
| `events` / `deadlines` | Calendar events and homework deadlines |
| `documents` / `document` | Subject documents |
| `resources` | Supabase storage resources |

### Mutations

| Field | Description |
|-------|-------------|
| `streamChatMessage` | Kicks off AI stream via Groq |
| `createChatSession` / `deleteChatSession` | Chat session management |
| `createFlashcardSet` / `updateFlashcardSet` | Flashcard management |
| `generateFlashcards` / `generateQuiz` | AI generation from text |
| `createEvent` / `updateEvent` / `deleteEvent` | Calendar management |
| `addDeadline` / `deleteDeadline` / `updateDeadline` | Homework management |
| `createRoom` / `joinRoom` / `leaveRoom` | Room management |
| `sendRoomMessage` / `updateRoomTimer` | Room interaction |
| `createDocument` / `updateDocument` / `deleteDocument` | Document management |
| `extractText` | PDF/DOCX text extraction |
| `reexplain` | Re-explain text with different anchor |
| `searchResearch` | OpenAlex + Crossref source lookup |
| `importIcs` | Calendar ICS file import |
| `updateProfile` / `updateSettings` | User profile management |
| `generateStudySchedule` | Weekly study plan generation |

### Subscriptions

| Field | Channel | Description |
|-------|---------|-------------|
| `chatStream` | `chatStream.{sessionId}` | Real-time AI token stream |
| `roomMessagesStream` | `roomMessages.{roomId}` | Live room chat |
| `roomPresenceStream` | `roomPresence.{roomId}` | Online status |
| `roomTimerStream` | `roomTimer.{roomId}` | Pomodoro state sync |

---

## Auth Flow

1. Client signs in via Supabase (Google OAuth PKCE)
2. Access token is attached to every HTTP request as `Authorization: Bearer <token>`
3. WebSocket connections use `connectionParams.Authorization`
4. `src/auth/verifyToken.ts` verifies the JWT against Supabase JWKS endpoint using `jose.jwtVerify`
5. Verified user is attached to GraphQL context (`ctx.user`), and a per-request Supabase client scoped to that user handles RLS

---

## Project Layout

```
AnalogixGraphQL/
├── Dockerfile              # multi-stage, node:22-bookworm-slim
├── fly.toml                # Fly.io config (region: syd, port 4000)
├── package.json
├── tsconfig.json
├── codegen.ts              # graphql-codegen config
└── src/
    ├── server.ts           # Apollo + Express + graphql-ws entry + Sandbox
    ├── env.ts              # Zod-validated env (fail-fast on missing)
    ├── context.ts          # Per-request GraphQL context
    ├── pubsub.ts           # Redis or in-process PubSub
    ├── logger.ts           # pino logger
    ├── supabase.ts         # Service-role + per-request clients
    ├── auth/
    │   └── verifyToken.ts  # jose-based Supabase JWT verification
    ├── ai/
    │   ├── groq.ts         # Groq completions + streaming with key failover
    │   ├── extractText.ts  # pdf-parse + mammoth text extraction
    │   ├── research.ts     # OpenAlex + Crossref source search
    │   └── ics.ts          # ical.js parser
    ├── schema/             # 14 SDL files (merged in index.ts)
    ├── resolvers/          # Matching resolvers + scalars + helpers
    ├── datasources/        # Reserved for future DataLoader-backed sources
    ├── types/              # Internal GraphQL types
    └── utils/              # Misc helpers
```

---

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | `tsx watch src/server.ts` (hot reload) |
| `npm run build` | `tsc -p tsconfig.json` |
| `npm start` | `node dist/server.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run codegen` | `graphql-codegen` against `codegen.ts` |

---

## Deploy to Fly.io

```bash
fly launch --no-deploy
fly secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... GROQ_API_KEY=... GROQ_API_KEY_2=... GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... DESMOS_API_KEY=... REDIS_URL=rediss://...
fly deploy
```

The Dockerfile is multi-stage on `node:22-bookworm-slim`. Runtime copies only the compiled `dist/` directories. Region: `syd` (Sydney).

---

## Troubleshooting

- **Subscriptions drop immediately** — Verify `CORS_ORIGINS` includes your client origin, and the WS URL is `wss://` in production.
- **"Missing authorization header"** — Client isn't attaching the Supabase access token. Check Apollo Client's auth link configuration.
- **"Row not found"** — RLS is working; the user doesn't own that row.
- **Groq 429** — Rate limited. Set `GROQ_API_KEY_2` for automatic failover on the next request.
- **WebSocket behind corporate proxy** — Ensure `Sec-WebSocket-Protocol` and `Connection: Upgrade` headers aren't stripped by middleware.
- **Sandbox not loading** — Ensure `NODE_ENV=development` or set `introspection: true` in production.
