# Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Vercel (analogix.vercel.app)                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  AnalogixWeb (Next.js 16 + Apollo Client)        │   │
│  │                                                  │   │
│  │  AI Features ───► /api/groq/* ──► Groq SDK       │   │
│  │  Data CRUD    ───► Supabase (direct)             │   │
│  │  Dashboard    ───► Apollo Client ────────────────┼───┼──┐
│  └──────────────────────────────────────────────────┘   │  │
└─────────────────────────────────────────────────────────┘  │
                                                             │
┌─────────────────────────────────────────────────────────┐  │
│  Render (analogix-graphql.onrender.com)                 │  │
│  ┌──────────────────────────────────────────────────┐   │  │
│  │  AnalogixGraphQL (Apollo Server 5 + Express 5)   │◄──┼──┘
│  │                                                  │   │
│  │  /graphql  (HTTP + WebSocket)                    │   │
│  │  /health   (liveness probe)                      │   │
│  │                                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │   │
│  │  │ Supabase │  │  Groq    │  │  Redis PubSub  │  │   │
│  │  │  (pg)    │  │  SDK     │  │ (subscriptions)│  │   │
│  │  └──────────┘  └──────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Expo (AnalogixMobile)                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Apollo Client ───► Render GraphQL (HTTP + WS)   │   │
│  │  Supabase Realtime ──► Supabase (direct)         │   │
│  │  AI Chat ───► Web mobile-chat route (via HTTPS)  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

The BFF (`AnalogixGraphQL`) is the single GraphQL gateway for both web and mobile. It handles JWT auth, rate limiting, and aggregates data from Supabase, Groq, and external APIs (OpenAlex, Crossref, Desmos).

---

## What Depends on the BFF

### Mobile (AnalogixMobile) — EVERYTHING needs it

The mobile app uses Apollo Client for all data. Without the BFF, the entire app is non-functional:

- **Auth** — profile queries (`me`, `updateProfile`, `updatePreferences`)
- **Subjects** — subjects, notes, marks, documents, custom subjects
- **Flashcards** — sets, cards, SM-2 grading, AI generation
- **AI Chat** — sessions, messages, streaming
- **Quizzes** — quiz CRUD, AI generation, grading, attempts
- **Calendar** — events, deadlines, ICS import
- **Study Rooms** — rooms, members, messages, timer sync
- **Curriculum** — subject data, progress maps
- **Formula Sheets** — LaTeX formula browsing & search
- **Dashboard** — XP, streak, achievements, activity log
- **AI Tools** — tutor, re-explain, study schedules, research search, text extraction

### Web (AnalogixWeb) — most things work, 3 features need it

The web app has dual paths — most features use direct Supabase calls, so they work without the BFF:

| Feature | Needs BFF? | Why |
|---------|-----------|-----|
| Auth (login/signup/OAuth) | No | Supabase Auth direct |
| Subjects, Notes, Documents | No | `subjectStore.tsx` → Supabase direct |
| Flashcards (CRUD + SM-2) | No | `flashcardStore.tsx` → Supabase direct |
| Chat History | No | `chatStore.ts` → Supabase direct |
| Events / Calendar | No | `eventStore.ts` → Supabase direct |
| Deadlines | No | `deadlineStore.ts` → Supabase direct |
| Study Rooms & Collab | No | `lib/rooms/` → Supabase direct |
| Workspace Knowledge Graph | No | `lib/workspace/` → Supabase direct |
| AI Memory | No | `lib/aiMemory.ts` → Supabase direct |
| **All** AI (chat, tutor, quiz, flashcards, etc.) | No | Next.js `/api/groq/*` → Groq SDK directly |
| Dashboard streak/stats widget | **Yes** | Apollo `USER_STATS` + `ACTIVITY_LOG` queries |
| Achievement auto-unlock popups | **Yes** | Apollo `ACHIEVEMENTS` + `UNLOCK_ACHIEVEMENT` |
| Tour completion tracking | **Yes** | Apollo `MARK_TOURS_COMPLETED` mutation |

---

## Prerequisites

| Requirement | Detail |
|------------|--------|
| Node.js | >=22.x, <27 (monorepo enforces this) |
| npm | >=11.x |
| GitHub account | Repo must be pushed to GitHub |
| Vercel account | Free (Hobby) — web already deployed at `analogix.vercel.app` |
| Render account | Free — no credit card required for initial setup? |
| Supabase account | Already set up (project `ffezpchxhxmxlkzkahha`) |
| Groq API key | Already set up |
| Google OAuth credentials | Already set up |

---

## Step 1: Deploy the BFF on Render

### 1a. Understand the `render.yaml`

The file at `/render.yaml` is a [Render Blueprint](https://render.com/docs/blueprint-spec) — it tells Render exactly how to build and run the BFF:

```yaml
services:
  - type: web                    # Web service (not worker or cron)
    name: analogix-graphql       # Service name (used in URL: name.onrender.com)
    env: node                    # Node.js runtime
    region: oregon               # US West — closest to Supabase + Vercel
    plan: free                   # Free tier (512 MB RAM, shared CPU)
    buildCommand: >              # Runs on every deploy
      npm install &&
      npm run build:shared &&
      npm run build:api
    startCommand: >              # Runs after build succeeds
      node AnalogixGraphQL/dist/server.js
    healthCheckPath: /health     # Render polls this every 5s to check liveness
    envVars:                     # Environment variables
      - key: NODE_ENV            #   Production mode (disables Apollo Sandbox)
        value: production
      - key: PORT                #   Render assigns 10000 internally
        value: 10000
      - key: CORS_ORIGINS        #   Which origins can call the API
        value: https://analogix.vercel.app
      # Secrets (set manually in dashboard — never commit to git):
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: GROQ_API_KEY
        sync: false
      - key: GROQ_API_KEY_2
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: REDIS_URL
        sync: false
```

The `sync: false` vars are secrets — their values are set once in the dashboard and never written to git.

### 1b. Connect to Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Blueprint**
3. Connect your GitHub account (if not already)
4. Select the `Analogix` repo
5. Render reads `render.yaml` and pre-fills all settings
6. Click **Apply**

### 1c. Set Secret Environment Variables

After the Blueprint syncs, you'll see the service with yellow warnings for the `sync: false` vars. Fill them in:

| Variable | Value | Where to find it |
|----------|-------|-----------------|
| `SUPABASE_URL` | `https://ffezpchxhxmxlkzkahha.supabase.co` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | *(anon public key)* | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | *(service_role key)* | **⚠️ Keep secret** — Supabase Dashboard → Project Settings → API |
| `GROQ_API_KEY` | `gsk_...` | Console.groq.com → API Keys |
| `GROQ_API_KEY_2` | `gsk_...` (optional) | Second key for rate-limit failover |
| `GOOGLE_CLIENT_ID` | `388360412953-...` | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google Cloud Console → Credentials |
| `REDIS_URL` | *(optional)* | Upstash.com free tier → Redis DB → REST URL |

Render will deploy automatically after saving. First deploy takes ~3-5 minutes (npm install + build).

### 1d. Verify Deployment

Once deployed, Render gives you a URL like `https://analogix-graphql.onrender.com`. Verify:

```bash
# Health check
curl https://analogix-graphql.onrender.com/health
# → {"status":"ok"}

# GraphQL introspection (should return GraphQL schema)
curl -X POST https://analogix-graphql.onrender.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
# → {"data":{"__typename":"Query"}}
```

---

## Step 2: Update Web Environment Variables

The web `.env` and `.env.local` already reference `https://analogix-graphql.onrender.com/graphql` as `NEXT_PUBLIC_GRAPHQL_HTTP_URL`. No changes needed — Vercel already uses this value.

If you set up Render with a **different URL** (e.g., custom domain), update:

- `AnalogixWeb/.env` → `NEXT_PUBLIC_GRAPHQL_HTTP_URL`
- `AnalogixWeb/.env.local` → `NEXT_PUBLIC_GRAPHQL_HTTP_URL`
- Redeploy web: `git push` or Vercel dashboard → Deploy

---

## Step 3: Build & Deploy Mobile (Expo APK)

### 3a. Update `eas.json`

`AnalogixMobile/eas.json` already has production profile values pointing to `https://analogix-graphql.onrender.com/graphql`. If your Render URL differs, update:

```json
"production": {
  "env": {
    "EXPO_PUBLIC_GRAPHQL_HTTP_URL": "https://analogix-graphql.onrender.com/graphql",
    "EXPO_PUBLIC_GRAPHQL_WS_URL": "wss://analogix-graphql.onrender.com/graphql"
  }
}
```

### 3b. Build the APK

Prerequisites (one-time setup):

| Tool | Why | Install |
|------|-----|---------|
| Expo CLI | Build + submit commands | `npm install -g eas-cli` |
| Expo account | Required for EAS Build | Sign up at [expo.dev](https://expo.dev) |
| EAS credentials | Android keystore | Auto-generated by EAS on first build |

```bash
# Login to Expo
eas login

# Build production APK
cd AnalogixMobile
eas build -p android --profile production
```

This produces:
- **APK** (`.apk`) — can be side-loaded on any Android device
- **Android App Bundle** (`.aab`) — for Google Play Store submission

### 3c. Distribute the APK

Once the build completes, EAS provides a download URL:
1. Go to [expo.dev](https://expo.dev) → Builds
2. Find the latest `production` build
3. Download the `.apk` file
4. Share with testers or install via `adb install app-release.apk`

---

## Local Development

```bash
# 1. Install dependencies (from monorepo root)
npm install

# 2. Build shared package (required first — other workspaces depend on it)
npm run build:shared

# 3. Start the BFF (port 4000)
npm run dev:api

# 4. In another terminal — start web (port 3000)
npm run dev:web

# 5. In another terminal — start mobile (port 8081)
npm run dev:mobile
```

**The web `NEXT_PUBLIC_GRAPHQL_HTTP_URL` in `.env.local` points to the Render URL** — so in dev mode, web talks to the deployed BFF. To use your local BFF, temporarily change it to `http://localhost:4000/graphql`.

---

## Environment Variables Reference

### AnalogixWeb (`AnalogixWeb/.env`)

| Var | Required | Description |
|-----|----------|-------------|
| `GROQ_API_KEY` | Yes | Primary Groq API key |
| `GROQ_API_KEY_2` | No | Secondary Groq key (rate-limit failover) |
| `DESMOS_API_KEY` | No | Desmos graphing calculator API |
| `ALLOW_DEV_API` | No | `true` to enable dev-only API features |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service_role key (server-side only) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Deployed web URL (`https://analogix.vercel.app`) |
| `NEXT_PUBLIC_GRAPHQL_HTTP_URL` | Yes | BFF GraphQL endpoint |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |

### AnalogixGraphQL (`AnalogixGraphQL/.env`)

| Var | Required | Default | Description |
|-----|----------|---------|-------------|
| `PORT` | No | `4000` | Server port |
| `NODE_ENV` | No | `development` | `development` / `production` |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed CORS origins |
| `SUPABASE_URL` | **Yes** | — | Supabase project URL |
| `SUPABASE_ANON_KEY` | **Yes** | — | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | — | Supabase service_role key (bypasses RLS) |
| `GROQ_API_KEY` | **Yes** | — | Primary Groq API key |
| `GROQ_API_KEY_2` | No | — | Secondary Groq key (rate-limit failover) |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `DESMOS_API_KEY` | No | — | Desmos graphing calculator API |
| `REDIS_URL` | No | — | Redis connection string for PubSub |
| `LOG_LEVEL` | No | `info` | Pino log level |

### AnalogixMobile (`eas.json` build profiles)

| Var | Required | Description |
|-----|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `EXPO_PUBLIC_GRAPHQL_HTTP_URL` | Yes | BFF GraphQL HTTP endpoint |
| `EXPO_PUBLIC_GRAPHQL_WS_URL` | Yes | BFF GraphQL WebSocket endpoint |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Yes | Google OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME` | Yes | OAuth redirect scheme (`analogix`) |

---

## Key Files

| File | Purpose |
|------|---------|
| `/render.yaml` | Render Blueprint — defines build, start, health check, env vars |
| `/deployment.md` | This file |
| `/AnalogixGraphQL/README.md` | BFF-specific setup & troubleshooting |
| `/AnalogixGraphQL/src/server.ts` | Server entry — Apollo + Express + WebSocket |
| `/AnalogixGraphQL/src/env.ts` | Environment variable definitions |
| `/AnalogixGraphQL/vercel.json` | (was for Vercel — not used with Render) |
| `/AnalogixGraphQL/.env.example` | Template for local BFF env |
| `/AnalogixWeb/.env` | Web env (committed — shared defaults) |
| `/AnalogixWeb/.env.local` | Web local overrides (gitignored) |
| `/AnalogixMobile/eas.json` | EAS Build config — env vars per profile |

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `npm install` fails on Render | Monorepo workspace resolution | Ensure `@analogix/shared` is built first (`npm run build:shared` in buildCommand) |
| `@analogix/shared` not found | Workspace not installed | The `buildCommand` runs `npm install && npm run build:shared` — verify both succeed |
| Web dashboard widgets empty | BFF not deployed / not reachable | Check `NEXT_PUBLIC_GRAPHQL_HTTP_URL` points to Render URL |
| Mobile app gets "Network Error" | BFF URL wrong in eas.json | Update `EXPO_PUBLIC_GRAPHQL_HTTP_URL` + `WS_URL` and rebuild |
| CORS errors in browser | CORS_ORIGINS doesn't include web origin | Add `https://analogix.vercel.app` to `CORS_ORIGINS` in Render env vars |
| Subscriptions disconnect | WebSocket URL not `wss://` | Ensure `EXPO_PUBLIC_GRAPHQL_WS_URL` uses `wss://` not `ws://` |
| Slow first request | Free tier cold start | Render free tier spins down after inactivity — ~5s wake-up on first request |
| Auth returns 401 | JWT mismatch | Check `SUPABASE_URL` + `SUPABASE_ANON_KEY` match the Supabase project the user signed up on |
| Render deploy fails | Memory limit on free plan | Free tier has 512 MB — tsc build may hit limit. If so, upgrade to Starter ($7/mo) |

---

## FAQ

**Q: Does the free Render plan require a credit card?**  
A: Render's free tier does require a credit card for verification, but you won't be charged as long as you stay within free limits (512 MB RAM, shared CPU, 750 hours/month).

**Q: Can I upgrade Render later?**  
A: Yes — Starter plan ($7/month) gives 1 GB RAM, more build minutes, and no cold starts.

**Q: Does the web work if Render is down?**  
A: Partially — all AI features, subjects, flashcards, notes, calendar, rooms, and auth work via direct Supabase + Next.js API routes. Only the dashboard streak/stats widget, achievement popups, and tour tracking break.

**Q: Why does mobile need the BFF but web doesn't?**  
A: Web has both Apollo Client (for BFF) and direct Supabase store hooks (`subjectStore`, `flashcardStore`, etc.). Mobile only has Apollo Client — the stores were never ported.

**Q: What about Redis?**  
A: Optional. Without `REDIS_URL`, subscriptions use in-process PubSub — fine for single-instance deployment. Add Upstash Redis (free 100 MB) for horizontal scaling.
