# Analogix Monorepo

Three apps, one shared package.

```
.
├── AnalogixWeb/          Next.js 16 (existing) — web client, incremental GraphQL migration
├── AnalogixGraphQL/      Apollo Server v4 BFF — single GraphQL gateway for web + mobile
├── AnalogixMobile/       Expo + React Native — Material 3 Expressive mobile app
└── packages/
    └── analogix-shared/  TS types, curriculum, formula sheets, achievements, Zod schemas
```

## Quick start

```bash
# 1. Install root + all workspaces
npm install

# 2. Copy env templates and fill in secrets
cp AnalogixGraphQL/.env.example AnalogixGraphQL/.env
cp AnalogixMobile/.env.example AnalogixMobile/.env
cp packages/analogix-shared/.env.example packages/analogix-shared/.env

# 3. Build the shared package (consumed by the others)
npm run build:shared

# 4. Start each app
npm run dev:api      # http://localhost:4000/graphql
npm run dev:web      # http://localhost:3000
npm run dev:mobile   # Expo dev server
```

## Where secrets live

| App | File | What goes there |
|---|---|---|
| `AnalogixGraphQL/.env` | server runtime | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `REDIS_URL`, `GOOGLE_CLIENT_SECRET`, `DESMOS_API_KEY`, `PORT` |
| `AnalogixMobile/.env` | bundled into app | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GRAPHQL_HTTP_URL`, `EXPO_PUBLIC_GRAPHQL_WS_URL` |
| `packages/analogix-shared/.env` | unused — shared package is pure code | n/a |

For Fly.io production deploy, secrets are set with `fly secrets set` (see `AnalogixGraphQL/fly.toml`).

See each project's own README for full setup.
