# API Endpoints

All routes are Next.js App Router route handlers under `src/app/api/`. They are grouped by concern below. Auth is enforced per-route via Supabase.

## AI & Groq

| Endpoint | Description |
|----------|-------------|
| `/api/groq/chat` | AI chat conversation |
| `/api/groq/tutor` | Dedicated tutor endpoint |
| `/api/groq/reexplain` | Re-explain a concept |
| `/api/groq/quiz` | Quiz generation |
| `/api/groq/quiz-review` | Quiz review feedback |
| `/api/groq/flashcard` | Flashcard generation |
| `/api/groq/flashcards` | Flashcard generation (plural variant) |
| `/api/groq/grade` | Short-answer grading |
| `/api/groq/study-schedule` | AI-generated study schedule from deadlines |
| `/api/groq/assessment-guide` | AI assessment guide from PDFs |
| `/api/groq/notion-ai` | Notion-style AI content generation |
| `/api/groq/banner` | Banner generation |
| `/api/groq/greeting` | Greeting generation |
| `/api/groq/document-ai` | Document-aware assistant (insert into notes) |
| `/api/groq/ar-concept` | AR concept generation |

## AI Operations & Memory

| Endpoint | Description |
|----------|-------------|
| `/api/ai` | AI entry point |
| `/api/ai/chat` | AI chat |
| `/api/ai/execute` | AI execution |
| `/api/ai/operations` | AI operations |
| `/api/ai/validate` | AI validation |
| `/api/ai/debug-rag` | RAG retrieval debugging |
| `/api/ai/memory` | AI memory management |
| `/api/ai/memory/extract` | Memory extraction |
| `/api/ai/personality` | Tutor personality presets |

## Auth

| Endpoint | Description |
|----------|-------------|
| `/api/auth/account-provider` | Account provider info (Google-only sign-in hint) |

## Documents

| Endpoint | Description |
|----------|-------------|
| `/api/documents/revert` | Document version revert |

## RAG

| Endpoint | Description |
|----------|-------------|
| `/api/rag/index` | Embedding index for workspace entities |

## Rooms

| Endpoint | Description |
|----------|-------------|
| `/api/rooms/[roomId]` | Room resource |
| `/api/rooms/[roomId]/presence` | Room presence tracking |
| `/api/rooms/[roomId]/timer` | Room timer management |
| `/api/rooms/[roomId]/leave` | Room leave |
| `/api/rooms/[roomId]/documents` | Room documents |
| `/api/rooms/[roomId]/documents/[documentId]` | Individual room document |
| `/api/rooms/[roomId]/members` | Room members |
| `/api/rooms/[roomId]/permissions` | Room permission changes (SECURITY DEFINER RPC) |
| `/api/rooms/[roomId]/transfer` | Room ownership transfer (SECURITY DEFINER RPC) |
| `/api/rooms/[roomId]/ai` | Room AI chat |
| `/api/rooms/[roomId]/messages` | Room messages |
| `/api/rooms/[roomId]/canvas` | Room canvas |
| `/api/rooms/join` | Join a room |

## Utilities

| Endpoint | Description |
|----------|-------------|
| `/api/tts/speak` | Text-to-speech |
| `/api/research/search` | Academic research search (OpenAlex, Crossref, Semantic Scholar) |
| `/api/health` | Health check endpoint |
| `/api/account/delete` | Account deletion (DELETE) |