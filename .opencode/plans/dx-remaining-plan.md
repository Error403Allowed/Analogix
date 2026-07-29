# Remaining DX Improvement Plan

Based on a comprehensive audit of the Analogix monorepo, all original 25+ DX items have been addressed **except** those listed below.

---

## Phase A: Enable Strict Mode (HIGHEST PRIORITY)

**AnalogixWeb/tsconfig.json** — currently `strict: false, noImplicitAny: false`

### A1 — Target cleanup (trivial)
| Setting | Current | Target |
|---------|---------|--------|
| `target` | `ES2017` | `ES2022` (match base) |
| `exclude` | contains `".next 2"`, `".next 4"` (ghost dirs) | Remove those entries |

**Risk: VERY LOW** — Next.js handles transpilation; ghost dirs don't exist.

### A2 — Enable `noImplicitAny` (medium effort)
Set `noImplicitAny: true`. This will produce ~50–200 new type errors where parameter/variable types are inferred as `any`.

**Risk: HIGH** — Could require hundreds of explicit type annotations.

**Risk aversion:**
1. Run `tsc --noEmit` first to count the exact number of errors
2. Fix systematically from most-used to least-used modules
3. Use `// @ts-expect-error` for genuinely complex cases (GraphQL query results, third-party integrations)
4. **Keep `@typescript-eslint/no-explicit-any: "off"`** in ESLint — this is about implicit inference, not explicit `any` annotations

### A3 — Enable `strict: true` (high effort)
`strict: true` enables: `strictNullChecks` (already on), `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`.

Since `strictNullChecks` is already on, the incremental cost over A2 is:
- `strictFunctionTypes` — few errors, mostly callback type mismatches
- `strictBindCallApply` — very few errors
- `strictPropertyInitialization` — ~5–20 errors (class properties without initializers)
- `noImplicitThis` — ~5–10 errors (callback `this` context)
- `alwaysStrict` — zero errors (already implied by module systems)

**Risk: MEDIUM** — Most strict checks are already on individually; `noImplicitAny` does the heavy lifting.

**Risk aversion:**
1. Must complete A2 first (it's the bulk of the work)
2. Enable strict mode in a single commit with `"strict": true` replacing individual `true` flags
3. After enabling, iterate with `tsc --noEmit` to fix remaining errors

---

## Phase B: Remove Unused Dependencies (LOW RISK)

### B1 — AnalogixWeb

| Package | Action | Verification |
|---------|--------|-------------|
| `rxjs` | **Remove** | Grep shows zero imports in `AnalogixWeb/src/` |
| `@vercel/speed-insights` | **Remove** | Zero imports (only `@vercel/analytics` in layout) |
| `@types/react-transition-group` | **Remove devDep** | Zero imports |
| `@types/web` | **Remove devDep** | Zero imports |

### B2 — AnalogixGraphQL

| Package | Action | Verification |
|---------|--------|-------------|
| `graphql-scalars` | **Remove** | Custom `DateTime`/`JSON` scalars used instead |
| `pino-http` | **Remove** | Zero imports in `AnalogixGraphQL/src/` |
| `ical.js` | **Remove** | Zero imports in `AnalogixGraphQL/src/` (used only in AnalogixWeb) |

**Risk: LOW** — Each removal verified by grep across all source files.

---

## Phase C: Add Barrel Exports (MEDIUM PRIORITY, LOW RISK)

Create `index.ts` files in directories with 3+ files to enable clean named imports:

### Priority 1 (most imported from)
- `src/hooks/index.ts` — 14 hooks
- `src/components/ui/index.ts` — 51 files
- `src/types/index.ts` — 16 types
- `src/utils/index.ts` — 20 utilities

### Priority 2 (domain-specific)
- `src/views/calendar/components/index.ts` — 12 components
- `src/components/chat/index.ts` — 9 components
- `src/views/calendar/index.ts` — 7 files
- `src/views/flashcards/index.ts` — 7 files
- `src/lib/tools/handlers/index.ts` — 5 handlers

### Priority 3 (niche)
- `src/lib/retrieval/index.ts` — 5 files
- `src/components/graphing/index.ts` — 4 components
- `src/lib/rooms/index.ts` — 3 files
- `src/lib/tools/index.ts` — 3 files
- `src/lib/supabase/index.ts` — 3 files
- `src/context/index.ts` — 3 contexts

**Risk: LOW** — Additive change. Existing deep imports remain valid.

**Risk aversion:**
- Do NOT remove existing deep import paths
- Use `export { X } from "./X"` pattern (not `export *`)
- Watch for circular dependencies with `madge` or `dpdm`

---

## Phase D: Consolidate Dual Toast Systems (MEDIUM RISK)

Two toast implementations coexist:
- `components/ui/sonner.tsx` (uses `sonner` npm package)
- `components/ui/toast.tsx` + `hooks/use-toast.ts` (uses `@radix-ui/react-toast`)

### Steps:
1. **Audit**: `grep -r "useToast\|radix.*toast" AnalogixWeb/src/` — count radix toast usages
2. **Decide**: Keep `sonner` (simpler, more usage, fewer deps)
3. **Migrate**: Any radix toast consumers → sonner `toast()`
4. **Remove**: Delete `toast.tsx`, `use-toast.ts`, remove `@radix-ui/react-toast` from package.json

**Risk aversion:**
- Audit first; do NOT delete until all consumers are migrated
- Keep both files during migration

---

## Phase E: Fix @analogix/shared Barrel Inconsistency (LOW RISK)

`src/index.ts` is missing `export * from "./data/resources.js"` — the subpath `./resources` works but the root barrel doesn't re-export resources.

**Fix:** Add the missing re-export to `src/index.ts`.

---

## Phase F: Remove Dead Code & Cruft (LOW RISK)

| Item | Location | Action |
|------|----------|--------|
| Empty `types/chat/` dir | `AnalogixWeb/src/types/chat/` | **Delete** |
| Ghost `".next 2"`, `".next 4"` | `AnalogixWeb/tsconfig.json` exclude | **Remove** (handled in A1) |
| Phantom `App.ts` ref | `tsconfig.eslint.json` include | **Remove** `App.ts` reference |

---

## Summary

| Phase | Item | Effort | Risk | Risk Aversion |
|-------|------|--------|------|---------------|
| A1 | Target + exclude cleanup | 5 min | None | — |
| A2 | `noImplicitAny: true` | 2–4 hrs | HIGH | Fix by module priority; `@ts-expect-error` for GraphQL |
| A3 | `strict: true` | 30–60 min | MEDIUM | Must complete A2 first; most checks already on |
| B | Remove unused deps | 15 min | LOW | Grep-verified |
| C | Barrel exports | 1–2 hrs | LOW | Backward-compatible |
| D | Toast consolidation | 1–2 hrs | MEDIUM | Audit before delete |
| E | Shared barrel fix | 5 min | LOW | Single line |
| F | Dead code removal | 10 min | LOW | Safe deletions |

**Total: ~5–9 hours** (A2 is the dominant variable).

**Dependency chain:** A1 → A2 → A3 (sequential). All other phases are independent.
