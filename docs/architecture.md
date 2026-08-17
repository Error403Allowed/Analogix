# Architecture

This document covers the high-level architecture of the Analogix codebase, the project structure, technology choices, and build configuration. It is a supporting document to the README.

## Overview

Single Next.js application (Next.js App Router, Turbopack) backed directly by Supabase. There is no separate API server or GraphQL layer - route handlers under `src/app/api/` talk to Supabase (Postgres, Auth, RLS) and to Groq through the Vercel AI SDK. The old GraphQL BFF and native mobile app were removed; `@analogix/shared` and `@analogix/mcp` are vendored under `vendor/` and wired in as `file:` dependencies.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── groq/         # AI endpoints (chat, quiz, flashcards, study-schedule, etc.)
│   │   ├── ai/           # AI operations (execute, operations, validate) and memory/personality
│   │   ├── auth/         # Auth helpers
│   │   ├── documents/    # Document operations
│   │   ├── rag/          # Embedding index
│   │   ├── rooms/        # Room-specific endpoints (incl. transfer + permissions RPCs)
│   │   ├── tts/          # Text-to-speech
│   │   ├── research/     # Academic research search
│   │   ├── health/       # Health check
│   │   └── account/      # Account deletion
│   ├── subjects/         # Subject workspace
│   ├── study-map/        # Study Map workspace
│   ├── rooms/            # Study rooms
│   └── ...
├── components/            # UI components
│   └── v2/               # v2 redesigned components
├── views/                 # Page components
│   └── v2/               # v2 studio components (ChatStudio, QuizStudio, etc.)
├── hooks/                 # Custom React hooks
├── utils/                 # Stores, hooks, parsers
├── lib/                  # Client/server utilities
│   ├── curriculum/       # ACARA curriculum data
│   ├── aiMemory/         # AI memory management
│   ├── rag/              # RAG retrieval across workspace entities
│   ├── rooms/            # Room mappers + permission defaults
│   ├── supabase/         # Client/server/admin Supabase clients
│   └── ...
├── services/             # API services
├── data/                 # Static resources (ACARA curriculum, formulaSheets, achievements)
├── types/                 # TypeScript type definitions
├── constants/            # App constants
└── context/              # React context providers

vendor/
├── analogix-shared/       # Types, Zod schemas, curriculum, formulas, achievements (file: dep)
└── analogix-mcp/          # MCP server exposing app data (file: dep)
```

## Technology Choices

### Frontend
- **Next.js 16 (App Router) + Turbopack**, React 19, TypeScript
- **Tailwind CSS + shadcn/ui** (Radix primitives)
- **BlockNote editor** (built on TipTap) for rich documents, with KaTeX math
- **Recharts** for charts generated from study data
- **Three.js** for 3D concept visualisation
- **Desmos** for interactive graphing

### Backend & Data
- **Supabase**: Auth (Google OAuth), Postgres, RLS policies, SECURITY DEFINER RPCs for room ownership transfer and permission changes
- **Groq** via the **Vercel AI SDK** (`@ai-sdk/groq`)
- **Yjs** (CRDT) with y-websocket for real-time collaboration
- **@huggingface/transformers** (`Xenova/bge-base-en-v1.5`) for RAG embeddings, lazily imported

### Supporting libraries
- pdf-parse + mammoth (text extraction)
- ical.js (calendar import)
- TanStack Query (data fetching)
- Framer Motion (animations)
- Zod (validation, shared with `@analogix/shared`)

## AI Models

Groq provides the model inference. The application routes requests by task type.

| Model | Use Case |
|-------|----------|
| `auto` | Auto-routes based on query classification |
| `openai/gpt-oss-120b` | Flagship model for complex tasks, coding and STEM |
| `qwen/qwen3.6-27b` | Reasoning model for mathematics and science (also powers image/vision extraction) |
| `openai/gpt-oss-20b` | Lightweight model for quick questions |

Configured model IDs are stored in source code and may change as Groq updates its catalogue. Deprecated Groq models (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `llama-4-scout`, `qwen-3-32b`, etc.) have been replaced; legacy saved model IDs are migrated automatically.

## Build Configuration (`next.config.mjs`)

- **Server external packages**: `pdf-parse`, `pdfjs-dist`, `@huggingface/transformers` - these rely on native bindings or load files from disk at require-time and must not be bundled on the server.
- **Server Actions body size limit**: 5 MB (file uploads are limited to 50 MB at the API layer).
- **Package import optimization**: lucide-react, selected Radix packages, recharts, date-fns, framer-motion are tree-shaken automatically.
- **Image formats**: AVIF and WebP.
- **Security headers**: strict CSP, X-Frame-Options DENY, HSTS, and related headers set globally via middleware.

## Data Model & Migrations

Schema and migrations live in `supabase/migrations/`. RLS policies protect all user data. Sensitive mutations (room ownership transfer, permission changes) run through SECURITY DEFINER RPCs because a direct `study_rooms` UPDATE would fail RLS `WITH CHECK`.

## Vendored Packages

- **`@analogix/shared`** - types, Zod schemas, curriculum data, formulas, achievements. Must be built before typecheck and before `@analogix/mcp` (mcp imports its dist).
- **`@analogix/mcp`** - MCP server exposing app data via the Model Context Protocol.

`node_modules/@analogix/{shared,mcp}` are symlinks into `vendor/`. Run `npm install` after changing vendored versions or `file:` specs.