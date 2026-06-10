# @analogix/shared

Shared types, Zod schemas, and data manifests for the Analogix monorepo.

Consumed by:
- `AnalogixWeb` (Next.js) — can be migrated incrementally
- `AnalogixGraphQL` (Apollo Server BFF) — primary consumer
- `AnalogixMobile` (Expo) — primary consumer

## Exports

The package exposes a root barrel and several subpath exports (defined in
`package.json#exports`):

| Subpath | Source | What's in it |
| --- | --- | --- |
| `@analogix/shared` | `src/index.ts` | Re-exports `types`, `schemas`, `curriculum`, `formulas` |
| `@analogix/shared/types` | `src/types/` | TS types + enums (incl. `AUSTRALIAN_STATES`, `GRADES`) |
| `@analogix/shared/schemas` | `src/schemas/` | Zod input/output schemas (chat, quiz, flashcard, …) |
| `@analogix/shared/curriculum` | `src/curriculum/` | ACARA curriculum manifest + types |
| `@analogix/shared/formulas` | `src/formulas/` | Formula sheets + `getFormulaSheetContext()` helper |
| `@analogix/shared/achievements` | `src/achievements/` | Achievement definitions (subpath only — not re-exported from root) |

```ts
import type { ChatMessage, AIPersonality, QuizData } from "@analogix/shared/types";
import { GenerateQuizInput, CreateFlashcardInput } from "@analogix/shared/schemas";
import { AUSTRALIAN_STATES, GRADES } from "@analogix/shared/types/enums";
import { getFormulaSheetContext } from "@analogix/shared/formulas";
import { ACHIEVEMENTS } from "@analogix/shared/achievements";
```

## Build

```bash
npm run build      # emits dist/
npm run watch      # rebuild on change
npm run typecheck
npm run lint       # placeholder — no linter configured yet
npm run clean      # removes dist/
```

The other workspaces depend on `dist/`, so run `npm run build:shared` from the
repo root (or `npm run watch` during development) after any change to the
shared package. The Apollo BFF's `dev` script is wired to restart on changes
to `dist/`.

## Migrating data from AnalogixWeb

The package exposes type-safe manifest interfaces for `curriculum`, `formulas`,
and `achievements`. The canonical data still lives in `AnalogixWeb/src/data/`
(legacy location, kept for the web app's REST routes):

| Data kind | Canonical home (today) | Migrate to shared package |
| --- | --- | --- |
| Curriculum | `AnalogixWeb/src/data/curriculum.ts` | `src/curriculum/data.ts` |
| Formula sheets | `AnalogixWeb/src/data/formulaSheets.ts` | `src/formulas/data.ts` |
| Achievements | `AnalogixWeb/src/data/achievements.tsx` | `src/achievements/data.ts` |

The data files in this package are currently thin re-exports. The web app
keeps its own copies during the migration period; the BFF imports from this
package directly. A code-gen step will eventually unify the two locations.

## Versioning

This is a workspace package — no publishing. It is consumed by the other
workspaces through npm workspaces' `file:` resolution.
