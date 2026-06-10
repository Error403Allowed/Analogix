# Analogix Monorepo

An AI-powered study platform for Australian secondary students (Years 7–12),
packaged as a Turborepo + npm-workspaces monorepo with three apps and one
shared package.

```
.
├── AnalogixWeb/          Next.js 16 (existing) — web client, incremental GraphQL migration
├── AnalogixGraphQL/      Apollo Server v5 BFF — single GraphQL gateway for web + mobile
├── AnalogixMobile/       Expo + React Native — Material 3 Expressive mobile app
└── packages/
    └── analogix-shared/  TS types, Zod schemas, ACARA curriculum, formula sheets, achievements
```

## Requirements

- **Node.js** `>=22 <27` (matches all three workspaces and the BFF Dockerfile)
- **npm** `>=11` (the repo pins `npm@11.16.0` via `packageManager`)
- A Supabase project (auth + Postgres + storage)
- A Groq API key (AI tutor)
- Optional: a Redis instance (e.g. Upstash) for horizontally-scaled GraphQL
  subscriptions; a Desmos API key; a Google OAuth client for native sign-in.

## Quick start

```bash
# 1. Install root + all workspaces
npm install

# 2. Copy env templates and fill in secrets
cp AnalogixGraphQL/.env.example AnalogixGraphQL/.env
cp AnalogixMobile/.env.example AnalogixMobile/.env
# packages/analogix-shared/.env.example is a placeholder — no env vars needed

# 3. Build the shared package (consumed by the others)
npm run build:shared

# 4. Start each app
npm run dev:api      # http://localhost:4000/graphql
npm run dev:web      # http://localhost:3000
npm run dev:mobile   # Expo dev server (port 8081)
# Optional, run in a fourth terminal:
npm run dev:shared   # watch mode for @analogix/shared
```

Turbo caches the `dev`, `build`, `typecheck`, and `lint` tasks across the
workspaces; see `turbo.json`.

## Where secrets live

| App | File | What goes there |
|---|---|---|
| `AnalogixGraphQL/.env` | server runtime | `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `GROQ_API_KEY_2`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DESMOS_API_KEY`, `REDIS_URL`, `LOG_LEVEL` |
| `AnalogixMobile/.env` | bundled into the client | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GRAPHQL_HTTP_URL`, `EXPO_PUBLIC_GRAPHQL_WS_URL`, `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME`, `EXPO_TOKEN` |
| `AnalogixWeb/.env.local` | Next.js (web) | `GROQ_API_KEY`, `GROQ_API_KEY_2`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SITE_URL`, `DESMOS_API_KEY`, `ALLOW_DEV_API` |
| `packages/analogix-shared/.env` | unused — shared package is pure code | n/a |

For Fly.io production deploy, secrets are set with `fly secrets set` (see
`AnalogixGraphQL/fly.toml`).

## Available root scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Run `dev` across all workspaces via Turbo |
| `npm run dev:api` | Start the GraphQL BFF |
| `npm run dev:web` | Start Next.js dev server |
| `npm run dev:mobile` | Start Expo Dev Client |
| `npm run dev:shared` | Watch the `@analogix/shared` package |
| `npm run build` | Build every workspace (depends on `^build`) |
| `npm run build:shared` | Build the shared package first |
| `npm run build:api` / `build:web` / `build:mobile` | Build a single workspace |
| `npm run typecheck` | `tsc --noEmit` across every workspace that defines the script |
| `npm run lint` | ESLint across every workspace that defines the script |
| `npm run clean` | Remove all build outputs |

## See also

- [`AnalogixGraphQL/README.md`](./AnalogixGraphQL/README.md) — BFF setup, env
  vars, schema, Fly.io deploy
- [`AnalogixMobile/README.md`](./AnalogixMobile/README.md) — Expo + RN app,
  PKCE Google sign-in, EAS builds
- [`AnalogixWeb/README.md`](./AnalogixWeb/README.md) — Next.js client (REST +
  incremental GraphQL migration)
- [`packages/analogix-shared/README.md`](./packages/analogix-shared/README.md) —
  shared types, schemas, and data manifests
