# AGENTS.md - Analogix

## Overview

Single Next.js app (Next.js 16 App Router, Turbopack) for an AI study platform, backed directly by Supabase. The old GraphQL BFF and native mobile app have been removed. `@analogix/shared` (types, curriculum, formulas, Zod schemas) and `@analogix/mcp` (MCP server) are vendored under `vendor/` and wired in as `file:` dependencies.

## Required setup order

1. `npm install` (install scripts run prebuild automatically)
2. Copy `.env.example` → `.env` / `.env.local`
3. `npm run dev` (Next.js on `:3000`)

## Key commands

| Command | What |
|---|---|
| `npm run dev` | Next.js 16 Turbopack on `:3000` |
| `npm run build` | Runs `prebuild` (builds `vendor/analogix-shared` + `vendor/analogix-mcp`) then `next build` |
| `npm run start` | Runs the production build |
| `npm run typecheck` | `tsc --noEmit --project tsconfig.typecheck.json` (run `npm run build --prefix vendor/analogix-shared` first) |
| `npm run lint` | Root ESLint flat config (single project) |
| `npm run test:unit` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e tests (starts dev server) |
| `npm run build --prefix vendor/analogix-shared` | Builds the vendored shared package |
| `npm run build --prefix vendor/analogix-mcp` | Builds the vendored MCP server |

## MUST-FOLLOW Instructions

- Ensure that all components work either using existing tests (from playwright or vitest), or create new tests for new components or code
- If there are any pre-existing errors, fix them after you have completed the main task(s)
- Always run tests after making a fix or making/editing a component/piece of code
- After context compaction, always refer back to AGENTS.md
- Do not go with quick fixes, make fixes that work in the long-term and produce less errors over time
- When asked to commit and push changes, make sure only YOUR changes are pushed neatly so that commits can be referred to in a neat and structured manner
- Before committing and pushing, ALWAYS run "npm run build". npm run build MUST PASS before pushing in order to create a valid vercel deployment. 
- When creating a plan, always complete a risk assessment and present it to the user transparently and with no bias whatsoever. 

## Testing

- Vitest for unit (`npm run test:unit`), Playwright for e2e (`npm run test:e2e`)
- Custom test runner: `node --import tsx scripts/run-tests.ts` (list/filter/tag flags)
- When creating new components, always create tests
    -> Playwright for extensive e2e testing
    -> Vitest for simple unit testing

- Use snyk cli to run codebase-wide tests on the repo to identify vulnerabilities. If any are found, fix them as easily as you can without putting anything at risk of more vulnerabilities.

## Project structure

- **App** - This repo root. Next.js 16 App Router (Turbopack), REST + Supabase (direct). Tailwind + shadcn/ui. Vercel-deployed via `vercel.json`.
- **`src/app/api/`** - Route handlers: auth, rooms (incl. `[roomId]/transfer`, `[roomId]/permissions`), documents, tutor, chat, subjects, quiz, profile, achievements, dashboard, mcp-proxy.
- **`src/lib/`** - `supabase/` (client/server/admin), `rooms/` (mappers + permission defaults), `stores/`, `mcp-executor.ts`, `ai/` (Vercel AI SDK v6 + `@ai-sdk/groq`).
- **`supabase/migrations/`** - SQL migrations (RLS policies, SECURITY DEFINER RPCs, seed data).
- **`@analogix/shared`** - Vendored at `vendor/analogix-shared/`. Types, Zod schemas, curriculum, formulas, achievements. Subpath exports: `@analogix/shared/{curriculum,formulas,achievements,types,schemas,tools,agent-quiz}`. Build first, always.
- **`@analogix/mcp`** - Vendored at `vendor/analogix-mcp/`. MCP server exposing app data via Model Context Protocol.

## Important constraints

- Node.js >=22 <27, npm >=11
- `tsc --noEmit` requires the shared package to be built first: `npm run build --prefix vendor/analogix-shared` before `npm run typecheck`
- ESLint config lives at root `eslint.config.mjs` - do NOT add per-workspace eslint config files (single project)
- Vendored packages are wired as `file:` deps in `package.json`; `prebuild` compiles `vendor/analogix-shared` then `vendor/analogix-mcp` (shared must build first — mcp imports its dist)
- `node_modules/@analogix/{shared,mcp}` are symlinks into `vendor/`; run `npm install` after changing vendored versions or `file:` specs
- Supabase migrations are applied manually against the remote/local DB; `.env` holds `SUPABASE_SERVICE_ROLE_KEY` + URL for server-side admin access
- Room ownership transfer and permission changes use SECURITY DEFINER RPCs (direct `study_rooms` UPDATE would fail RLS `WITH CHECK`)
- App data migration: legacy `src/data/` (web) is the canonical source until fully moved into `@analogix/shared`
