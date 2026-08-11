# AGENTS.md - Analogix Monorepo

## Overview

Monorepo (npm workspaces + Turborepo) for an AI study platform. Four workspaces under `AnalogixWeb/`, `AnalogixMobile/`, `AnalogixGraphQL/`, `packages/analogix-shared/`, and `packages/analogix-mcp/`.

## Required setup order

1. `npm install`
2. Copy `.env.example` → `.env` / `.env.local` per workspace
3. **`npm run build:shared`** - must run first; all other workspaces depend on `@analogix/shared/dist/`
4. `npm run dev:api` (terminal 1), `npm run dev:web` (terminal 2), `npm run dev:mobile` (terminal 3)

## Key commands

| Command | What |
|---|---|
| `npm run dev:shared` | Watches `@analogix/shared` for changes |
| `npm run dev:api` | Hot-reloads the GraphQL BFF on `:4000` |
| `npm run dev:web` | Next.js 16 Turbopack on `:3000` |
| `npm run dev:mobile` | Expo dev client on `:8081` |
| `npm run typecheck` | Turbo runs `tsc --noEmit` across all workspaces (depends on `^build`) |
| `npm run lint` | Root ESLint flat config with per-workspace tsconfig overrides |
| `npm run build` | Turbo builds all workspaces in dependency order |
| `npm run clean` | Clears `dist/`, `.next/`, etc. |

## MUST-FOLLOW Instructions

- Ensure that all components work either using existing tests (from playwright or vitest), or create new tests for new components or code
- If there are any pre-existing errors, fix them after you have completed the main task(s)
- Always run tests after making a fix or making/editing a component/piece of code
- After context compaction, always refer back to AGENTS.md
- Do not go with quick fixes, make fixes that work in the long-term and produce less errors over time
- When asked to commit and push changes, make sure all local changes are pushed neatly so that commits can be referred in a neat and structured manner
- Before committing and pushing, ALWAYS run "npm run build". npm run build MUST PASS before pushing in order to create a valid vercel deployment. 
- When creating a plan, always complete a risk assessment and present it to the user transparently and with no bias whatsoever. 

## Testing

- **AnalogixWeb only**: Vitest for unit (`npm run test:unit`), Playwright for e2e (`npm run test:e2e`)
- Other workspaces have no tests configured
- Web custom test runner: `node --import tsx scripts/run-tests.ts` (list/filter/tag flags)
- When creating new components, always create tests
    -> Playwright for extensive e2e testing
    -> Vitest for simple unit testing

- Use snyk cli to run codebase-wide tests on the repo to identify vulnerabilities. If any are found, fix them as easily as you can without putting anything at risk of more vulnerabilities.

## Workspace specifics

- **`AnalogixWeb/`** - Next.js 16 App Router, REST + GraphQL (Apollo Client). Tailwind + shadcn/ui. Vercel-deployed via `vercel.json`.
- **`AnalogixMobile/`** - Expo SDK 54, RN 0.81 (New Architecture), react-native-paper M3. EAS build profiles in `eas.json`. GraphQL codegen: `npm run codegen` (in workspace).
- **`AnalogixGraphQL/`** - Apollo Server v5 + Express 5 + `graphql-ws`. Redis PubSub for subscriptions (falls back to in-process when `REDIS_URL` unset). Dev mode: `tsx watch src/server.ts`. Apollo Sandbox at `/graphql` in dev only.
- **`@analogix/shared`** - Types, Zod schemas, curriculum, formulas, achievements. Subpath exports: `@analogix/shared/{curriculum,formulas,achievements,types,schemas,tools,agent-quiz}`. Build first, always.
- **`@analogix/mcp`** - MCP server exposing app data via Model Context Protocol. Built with `npm run build:mcp`.

## Important constraints

## Migration Work Summary (brand.primary → theme.colors.primary + alpha())

All 28+ files in AnalogixMobile have been migrated. The migration replaced:
- `brand.primary` → `theme.colors.primary` (from `useThemeContext()`) across all screens/components, except where `brand` is intentionally kept for decorative/auth UI (LoginScreen orbs, Expressive decorative elements).
- Hex color suffix patterns → `alpha()` function calls using the configured opacity table.
- `paperTheme.colors.X` → `theme.colors.X` in files where `useThemeContext` was already imported.
- Added `alpha` import to 20+ files where suffix patterns existed.

Key mapping applied:
| Hex suffix | Opacity |
|---|---|
| `"08"` | `0.03` |
| `"10"` | `0.06` |
| `"12"` | `0.07` |
| `"14"` | `0.08` |
| `"15"` | `0.09` |
| `"16"` | `0.10` |
| `"18"` | `0.10` |
| `"1A"` | `0.10` |
| `"20"` | `0.13` |
| `"22"` | `0.13` |
| `"30"` | `0.19` |
| `"40"` | `0.25` |
| `"44"` | `0.27` |
| `"60"` | `0.38` |
| `"66"` | `0.40` |
| `"80"` | `0.50` |
| `"99"` | `0.60` |
| `"aa"` | `0.67` |

Build verified: `npm run build` passes.

- Node.js >=22 <27, npm >=11
- `tsc --noEmit` requires `^build` (shared must be built first). Run `npm run build:shared` before `npm run typecheck`.
- ESLint config lives at root `eslint.config.mjs` - do NOT add per-workspace eslint config files
- GraphQL files marked as generated in `.gitignore`: `src/graphql/generated/`
- No CI/CD config present (no `.github/` directory)
- Supabase local only has `.temp/` - migrations are not in this repo
- Android native code in `android/` (generated by Expo)
- Mobile tabs: Home, Tutor, Study, Subjects, Rooms, Profile
- Web uses Vercel AI SDK v6 + `@ai-sdk/groq` v3 for AI features
- Shared package data is migrating from `AnalogixWeb/src/data/` - canonical source is still web for now
