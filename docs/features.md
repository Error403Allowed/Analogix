# Features

Analogix is a study workspace for Australian secondary students (Years 7-12). It combines a Groq-powered AI tutor with a structured study workspace (documents, flashcards, quizzes, study guides, collaborative rooms, and planning tools) so complex ideas feel intuitive and actionable.

## AI Learning

- **Analogix AI Tutor** - Analogy-first explanations woven throughout every response (not just at the end), connecting concepts to a student's interests automatically.
- **ACARA Curriculum Integration** - Responses are grounded in the Australian Curriculum v9.0 (Years 7-12).
- **Workspace Context** - The tutor can use selected information from the student's workspace, including documents, flashcards, and calendar events.
- **Model Routing** - Query classification routes to coding, reasoning, or general models.
- **Subject Alignment** - State-specific syllabus alignment (VIC, NSW, QLD, SA, WA, TAS, NT, ACT).
- **Formula Context** - Maths/science formulas injected automatically when relevant.
- **AI Memory and Personality** - Tutor personality presets (friendly tutor, strict professor, and more). Students can manage tutor memories and use them to personalise future explanations. Memory features are still being refined.
- **Study Schedule Generator** - AI creates day-by-day study schedules from calendar events.
- **Assessment Guide Generator** - Upload assessment notifications (PDF) to get AI-generated study plans.
- **Text-to-Speech** - TTS using the browser SpeechSynthesis API.
- **Academic Research Search** - Search academic papers via OpenAlex, Crossref, and Semantic Scholar.

## Documents & Study Workspace

- **Per-subject Documents** - Rich TipTap editor with math (KaTeX), code blocks, tables, autosave.
- **BlockNote Editor** - Notion-style blocks, slash commands, markdown shortcuts.
- **Document Assistant** - Doc-aware chat with "insert into notes".
- **Document Revert** - Backup and restore previous versions.
- **Yjs Collaboration** - Real-time sync using the Yjs CRDT.

## Flashcards & Quizzes

- **AI Flashcards** - Generated from chat or uploaded documents.
- **Manual Flashcards** - Create your own with front/back.
- **Spaced Repetition** - SM-2 algorithm with due scheduling.
- **Adaptive Quizzes** - Difficulty levels, timers, AI review feedback.
- **Short-answer Grading** - AI-powered answer evaluation.
- **Analogy Hints** - Get hints framed as analogies.

## Study Planning & Progress

- **Study Map** - Workspace for subject overview with pending tasks, document counts, and momentum scores.
- **Calendar** - Day/week/month views, .ics import from school calendars.
- **Deadlines** - Assignment tracking with priority levels.
- **Study Timer** - Pomodoro-style sessions with goals.
- **Streaks** - Daily streak tracking.
- **Achievements** - Unlock badges for milestones.
- **Activity Stats** - Time spent, accuracy, progress over time.
- **Data Charts** - Charts generated from study data using Recharts (bar, line, pie, area).
- **3D Concept Visualisation** - 3D scenes with Three.js (atoms, molecules, networks, hierarchies, timelines).
- **Function Plotting** - Mathematical graph visualization with Desmos.

## Collaboration & Rooms

- **Study Rooms** - Create rooms for subjects or projects.
- **Room Members** - Invite peers to collaborate.
- **Real-time Editing** - Collaborative document editing in rooms.
- **Shared Flashcards** - Practice together with shared card sets.

## Resources & Formulas

- **Resource Library** - Upload PDFs, DOCX, images, presentations.
- **Formula Sheets** - Subject-specific formula references.
- **Formula Search** - Search across all formula sheets.

## Personalization & UX

- **Google Sign-in** - Supabase Auth with Google OAuth.
- **Onboarding** - Select subjects, grade, state, interests.
- **Theme Selector** - Light/dark mode, custom themes.
- **Responsive UI** - Works on desktop and tablet.
- **Account Deletion** - Users can delete their accounts.

## File Uploads

- **Supported formats**: PDF, DOCX/DOC, PPTX/PPT, TXT, MD, CSV, RTF, images (JPG, PNG, WEBP).
- **Max size**: 50 MB per file.
- **Used for**: Chat attachments, study guides, quizzes, flashcards, resources.

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
| `/study-map` | Study Map Home | Subject overview with pending tasks, document counts, and momentum scores |
| `/study-map/[subjectId]` | Study Map Subject | Per-subject workspace with homework/task management |
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
| `/support` | Support | FAQ page with quick links to GitHub issues, bug reports, and feature requests |
| `/privacy` | Privacy Policy | Detailed privacy policy |
| `/not-found` | 404 Page | Custom not-found page |