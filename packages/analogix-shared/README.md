# @analogix/shared

Shared types, Zod schemas, and data manifests for the Analogix monorepo.

Consumed by:
- `AnalogixWeb` (Next.js) — can be migrated incrementally
- `AnalogixGraphQL` (Apollo Server BFF) — primary consumer
- `AnalogixMobile` (Expo) — primary consumer

## Exports

```ts
import type { ChatMessage, AIPersonality, QuizData } from "@analogix/shared/types";
import { GenerateQuizInput, CreateFlashcardInput } from "@analogix/shared/schemas";
import { AUSTRALIAN_STATES, GRADES } from "@analogix/shared/types/enums";
import { getFormulaSheetContext } from "@analogix/shared/formulas";
```

## Build

```bash
npm run build      # emits dist/
npm run watch      # rebuild on change
npm run typecheck
```

The other workspaces depend on `dist/`, so run `npm run build:shared` from the
repo root after any change to the shared package.

## Migrating data from AnalogixWeb

The package exposes type-safe manifest interfaces for `curriculum`, `formulas`,
and `achievements`. The real data lives in `AnalogixWeb/src/data/`:

| File in AnalogixWeb                  | Migrate to shared package             |
| ------------------------------------ | ------------------------------------- |
| `src/data/curriculum.ts`             | `src/curriculum/data.ts` + re-export  |
| `src/data/formulaSheets.ts`          | `src/formulas/data.ts` + re-export    |
| `src/data/achievements.tsx`          | `src/achievements/data.ts` + re-export|

The data files in this package start empty as placeholders. The web app keeps
its own copies during the migration period; the BFF imports its own copies
served by the resolvers until a code-gen step unifies the two.

## Versioning

This is a workspace package — no publishing. It is consumed by the other
workspaces through npm workspaces' `file:` resolution.
