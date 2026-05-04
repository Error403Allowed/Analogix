# Analogix

Analogix is an AI-powered study platform for Australian secondary students (Years 7-12). It combines a Groq-powered AI tutor with a structured study workspace (documents, flashcards, quizzes, study guides, collaborative rooms, and planning tools) so complex ideas feel intuitive and actionable.

---

## Features

### AI Learning & Agents
- **Analogix AI Tutor** - Analogy-first explanations woven throughout every response (not just at the end), connecting concepts to student's interests automatically
- **ACARA Curriculum Integration** - Deep knowledge of Australian Curriculum v9.0 (Years 7-10) built into the AI for curriculum-aligned responses
- **Agentic Workflow** - 4 specialized AI agents:
  - 📅 **Study Planner** - Schedules, deadlines, study plans, progress tracking
  - 📝 **Notes Agent** - Create, edit, summarize documents, extract key points
  - ✅ **Task Manager** - Tasks, reminders, prioritization
  - 🤝 **Collaboration Agent** - Study rooms, invites, collaborative editing
- **Workspace AI** (bottom-right) - References your notes & flashcards, generates flashcards & quizzes inline
- **Smart Model Routing** - Automatic routing to coding, reasoning, or general models
- **Subject Alignment** - Full ACARA curriculum knowledge with state-specific syllabus alignment (VIC, NSW, QLD, SA, WA, TAS, NT, ACT)
- **Formula Context** - Maths/science formulas injected automatically

### Documents & Study Workspace
- **Per-subject Documents** - Rich TipTap editor with math (KaTeX), code blocks, tables, autosave
- **BlockNote Editor** - Notion-style blocks, slash commands, markdown shortcuts
- **AI Document Assistant** - Doc-aware chat with "insert into notes"
- **Document Revert** - Backup and restore previous versions
- **Yjs Collaboration** - Real-time sync using Yjs CRDT

### Flashcards & Quizzes
- **AI Flashcards** - Generated from chat or uploaded documents
- **Manual Flashcards** - Create your own with front/back
- **Spaced Repetition** - SM-2 algorithm with due scheduling
- **Adaptive Quizzes** - Difficulty levels, timers, AI review feedback
- **Short-answer Grading** - AI-powered answer evaluation
- **Analogy Hints** - Get hints framed as analogies

### Study Planning & Progress
- **Calendar** - Day/week/month views, .ics import from school calendars
- **Deadlines** - Assignment tracking with priority levels
- **Study Timer** - Pomodoro-style sessions with goals
- **Streaks** - Daily streak tracking
- **Achievements** - Unlock badges for milestones
- **Activity Stats** - Time spent, accuracy, progress over time

### Collaboration & Rooms
- **Study Rooms** - Create rooms for subjects or projects
- **Room Members** - Invite peers to collaborate
- **Real-time Editing** - Collaborative document editing in rooms
- **Shared Flashcards** - Practice together with shared card sets

### Resources & Formulas
- **Resource Library** - Upload PDFs, DOCX, images, presentations
- **Formula Sheets** - Subject-specific formula references
- **Formula Search** - Search across all formula sheets

### Personalization & UX
- **Google Sign-in** - Supabase Auth
- **Onboarding** - Select subjects, grade, state, interests
- **Theme Selector** - Light/dark mode, custom themes
- **Responsive UI** - Works on desktop and tablet

---

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Public landing page |
| `/login` | Login | Google authentication |
| `/onboarding` | Onboarding | Initial subject/grade setup |
| `/dashboard` | Dashboard | Home with stats, deadlines, streak |
| `/subjects` | Subjects | Subject overview |
| `/subjects/:id` | Subject Detail | Subject workspace |
| `/subjects/:id/document/:docId` | Document Editor | Rich text editor |
| `/chat` | Chat | AI tutor conversation |
| `/flashcards` | Flashcards | Flashcard review |
| `/quiz` | Quiz | Quiz practice |
| `/calendar` | Calendar | Event calendar |
| `/timer` | Timer | Study timer |
| `/rooms` | Rooms | Study rooms |
| `/rooms/:roomId` | Room Workspace | Collaborative room |
| `/achievements` | Achievements | Badges and milestones |
| `/resources` | Resources | File library |
| `/formulas` | Formulas | Formula reference |

---

## AI Models (Groq)

Analogix uses Groq's OpenAI-compatible API with task-based routing:

| Model | Use Case |
|-------|----------|
| `auto` | Auto-routes to best model for query |
| `deepseek-r1-distill-llama-70b` | Analogix Maths - maths, coding, logic |
| `qwen-3-32b` | Analogix Science - science & reasoning |
| `allam-2-7b` | Analogix General - all subjects |
| `llama-3.3-70b-versatile` | Analogix Expert - complex tasks |
| `allam-2-7b` | Analogix Creative - creative writing |
| `llama-3.1-8b-instant` | Analogix Quick - fast responses |
| `openai/gpt-oss-120b` | Analogix Long - long context, high output |

---

## File Uploads

- **Supported**: PDF, DOCX/DOC, PPTX/PPT, TXT, MD, CSV, RTF, images (JPG, PNG, WEBP)
- **Max size**: 50 MB per file
- **Used for**: Chat attachments, study guides, quizzes, flashcards, resources

---

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- React 18, TypeScript
- Tailwind CSS + shadcn/ui (Radix)
- Framer Motion animations
- TipTap + BlockNote editor
- KaTeX for math, react-markdown
- CodeMirror for code blocks

### Backend & Data
- Groq API (OpenAI-compatible)
- Supabase Auth + Postgres + RLS
- TanStack Query
- Yjs for real-time collaboration

### Utilities
- pdf-parse + mammoth (text extraction)
- ical.js (calendar import)
- @codemirror/lang-python
- Vercel Analytics + Speed Insights

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm or bun
- Groq API key
- Supabase project

### Setup

1. Clone and install:
```bash
git clone https://github.com/Error403Allowed/Analogix.git
cd Analogix
npm install
```

2. Set up Supabase:
```bash
# Create project at supabase.com
# Run migrations from supabase/migrations/
# Enable Google Auth in Authentication → Providers
```

3. Create `.env.local`:
```env
# Groq (required)
GROQ_API_KEY=your_groq_api_key
GROQ_API_KEY_2=optional_secondary_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_REALTIME_URL=       # Optional for production
```

4. Run:
```bash
npm run dev
```
Open `http://localhost:3000`

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint check |
| `npm run tests` | Run tests |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── groq/         # AI endpoints (chat, quiz, flashcards, etc.)
│   │   ├── agents/       # Agentic workflow
│   │   └── ...
│   ├── subjects/         # Subject workspace
│   ├── rooms/            # Study rooms
│   └── ...
├── components/            # UI components
├── views/                 # Page components
├── utils/                 # Stores, hooks, parsers
├── lib/                  # Client/server utilities (curriculum, aiMemory, etc.)
├── services/             # API services
└── data/               # Static resources (ACARA curriculum, formulaSheets, achievements)
```

---

## Deployment

Vercel (recommended):
```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel project settings.

---

## Troubleshooting

### Missing GROQ_API_KEY
Add to `.env.local` and restart server.

### Auth Redirect Errors
Set `NEXT_PUBLIC_SITE_URL` and whitelist in Supabase Auth.

### File Upload Fails
Check file size (50MB max) and format.

### TypeScript/ESLint Errors
Run `npm run lint` and fix issues before deploying.

---

## Contributing

Issues and PRs welcome!