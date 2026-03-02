# Analogix

**Analogix** is a modern, analogy-based learning platform that helps students master complex concepts by connecting them to things they already care about—like gaming, sports, or music. Powered by Groq AI with smart model routing, Analogix explains difficult topics using personalized analogies that make concepts stick.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**Live:** [analogix.vercel.app](https://analogix.vercel.app)

---

## 🎯 Features

### Core Learning
- **Dynamic Analogy Tutor ("Quizzy")**: Real-time AI conversations that explain complex subjects through personalized analogies
- **Smart Model Routing**: Automatically selects the best AI model based on question type (coding, reasoning, or general)
- **Re-Explain**: Ask Quizzy to explain the same concept in a completely different way, optionally anchored to a specific interest
- **Interactive Quizzes**: Auto-generated practice questions with AI-powered review
- **Flashcards**: AI-generated spaced-repetition flashcards from your chat conversations
- **15+ Subjects**: Mathematics, Physics, Chemistry, Biology, English, History, Geography, Computing, Economics, Business, Commerce, PDHPE, Engineering, Medicine, and Languages

### Study Tools
- **Formula Sheets**: State-aware formula references for each subject
- **Resources Library**: 110+ past papers and 120+ textbooks — all free and paywall-free, with direct state-filtered government URLs (NESA/VCAA/QCAA/SCSA/TASC/BSSS)
- **Study Timer**: Dedicated timer for focused study sessions
- **Study Schedule Generator**: AI-generated day-by-day study plans based on your upcoming exams and deadlines
- **Subject Notes**: Rich text editor (TipTap) for per-subject notes with markdown, code blocks, math, tables, and more
- **Assessment Guides**: AI-generated guidance for upcoming assessments

### Personalization
- **Google Sign-In**: Secure authentication via Supabase Auth with Google OAuth
- **Personalized Onboarding**: Select your subjects, hobbies, grade, and state
- **Grade-Level Adaptation**: Content adjusts to junior/middle/senior levels
- **Analogy Intensity Control**: Choose how many analogies you want in explanations (0-5 levels)
- **Mood System**: Adapts AI tone based on your current mood

### Progress Tracking
- **Mastery Dashboard**: View statistics, streaks, and accuracy metrics
- **Achievement Badges**: Unlock rewards for milestones and learning achievements
- **Activity Heatmap**: Visualize your daily study activity
- **Subject Analytics**: Track marks and see which subjects you're strongest in
- **Chat History**: Persistent conversation history synced to the cloud

### Organization
- **Calendar Integration**: Track upcoming exams and deadlines
- **Deadline Manager**: Set and manage assignment/exam deadlines with priorities
- **ICS File Support**: Import events from your calendar apps
- **Quick Chat**: Fast questions without opening the full tutor

### Design
- **Dark Mode Default**: Eye-friendly dark theme with optional light mode
- **Theme Selector**: Multiple color themes to choose from
- **Responsive Sidebar Layout**: Collapsible sidebar navigation
- **Smooth Animations**: Framer Motion effects for polished interactions
- **Confetti & Particle Effects**: Celebratory animations for achievements
- **Tutorial Overlay**: First-visit walkthrough for new users

---

## 🛠️ Tech Stack

### Frontend
- **React 18** — UI framework
- **Next.js 16** (App Router) — React framework, routing, and SSR
- **TypeScript** — Type-safe development
- **Tailwind CSS** — Utility-first styling
- **Framer Motion** — Smooth animations
- **shadcn/ui** — Headless component library (Radix UI primitives)
- **TipTap** — Rich text editor for subject notes
- **Recharts** — Data visualization (charts & graphs)
- **Lucide Icons** — Icon library
- **KaTeX** — LaTeX math rendering

### Backend & AI
- **Groq API** — AI model hosting (OpenAI-compatible interface)
- **Llama 4 Maverick 17B** — Primary language model (128K context)
- **Llama 4 Scout 17B** — Fallback model
- **Qwen3-32B** — Reasoning/math model
- **GPT-OSS-120B** — Reasoning fallback
- **Smart Task Classifier** — Automatically routes coding, reasoning, and general questions to the best model
- **API Key Rotation** — Round-robin key management with automatic failover

### Auth & Database
- **Supabase Auth** — Google OAuth sign-in
- **Supabase PostgreSQL** — Cloud database with Row Level Security
- **Supabase SSR** — Server-side auth helpers for Next.js

### State & Data
- **React Query (TanStack)** — Data fetching & caching
- **Supabase Realtime** — Cloud-synced user data
- **Custom Stores** — `statsStore`, `achievementStore`, `eventStore`, `chatStore`, `flashcardStore`, `subjectStore`, `deadlineStore`, `activityLog`
- **Next App Router** — File-based routing with protected routes

### Utilities
- **ical.js** — Calendar file parsing
- **date-fns** — Date manipulation
- **Zod** — Schema validation
- **Sonner** — Toast notifications
- **Vercel Analytics + Speed Insights** — Production monitoring

---

## 📦 Installation & Setup

### Prerequisites
- **Node.js** v18+ (check with `node --version`)
- **npm** or **bun** package manager
- **Groq API Key** (get one at [console.groq.com](https://console.groq.com))
- **Supabase Project** (create one at [supabase.com](https://supabase.com))

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Error403Allowed/Analogix.git
   cd Analogix
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or with bun:
   bun install
   ```

3. **Set up Supabase:**
   - Create a new Supabase project
   - Run `supabase-schema.sql` in the Supabase SQL Editor to create all required tables
   - Enable Google Auth in Supabase → Authentication → Providers

4. **Create `.env.local` file** in the project root:
   ```env
   # AI (required)
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_API_KEY_2=optional_backup_key_for_rotation

   # Supabase (required)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # App (optional)
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Build for production:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🗂️ Project Structure

```
Analogix/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout + providers
│   │   ├── page.tsx                # Landing page
│   │   ├── login/                  # Login page
│   │   ├── onboarding/             # Onboarding wizard
│   │   ├── dashboard/              # Main dashboard
│   │   ├── chat/                   # AI tutor (Quizzy)
│   │   ├── quiz/                   # Practice quizzes
│   │   ├── flashcards/             # Spaced-repetition flashcards
│   │   ├── subjects/               # Subject overview & detail
│   │   │   └── [id]/               # Dynamic subject pages
│   │   ├── resources/              # Past papers & textbooks
│   │   ├── formulas/               # Formula sheets
│   │   ├── timer/                  # Study timer
│   │   ├── achievements/           # Badges & milestones
│   │   ├── calendar/               # Events & deadlines
│   │   ├── auth/callback/          # OAuth callback handler
│   │   └── api/
│   │       ├── health/             # Health check endpoint
│   │       ├── account/delete/     # Account deletion
│   │       └── hf/                 # AI endpoints
│   │           ├── chat/           # Main chat completion
│   │           ├── reexplain/      # Re-explanation
│   │           ├── quiz/           # Quiz generation
│   │           ├── quiz-review/    # Quiz review
│   │           ├── flashcard/      # Flashcard generation
│   │           ├── greeting/       # AI greeting
│   │           ├── banner/         # AI banner phrases
│   │           ├── grade/          # Grading
│   │           ├── study-schedule/ # Study plan generation
│   │           └── assessment-guide/
│   ├── views/                      # Page-level view components
│   ├── components/                 # Reusable UI components
│   │   └── ui/                     # shadcn/ui primitives
│   ├── services/
│   │   └── groq.ts                 # Client-side AI service layer
│   ├── context/
│   │   └── AuthContext.tsx          # Supabase auth provider
│   ├── lib/
│   │   ├── supabase/               # Supabase client helpers
│   │   ├── fetch-wrapper.ts        # Fetch with retries
│   │   ├── env-validation.ts       # Environment diagnostics
│   │   ├── timerStore.ts           # Timer persistence
│   │   └── pastPapers.ts           # Past paper utilities
│   ├── utils/                      # Data stores & helpers
│   ├── data/                       # Static data (resources, formulas, achievements)
│   ├── constants/                  # Subject catalog, interests
│   ├── types/                      # TypeScript interfaces
│   ├── hooks/                      # Custom React hooks
│   └── test/                       # Test files
├── public/                         # Static assets
├── supabase-schema.sql             # Database schema
├── package.json
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 How It Works

### User Journey
```
Landing Page → Google Sign-In → Onboarding (subjects, hobbies, grade, state)
  ↓
Dashboard (stats, streaks, activity heatmap, quick access)
  ↓
Choose Activity:
  ├─ Chat with Quizzy (AI tutor)
  ├─ Take a Quiz → AI Review
  ├─ Study Flashcards
  ├─ View Subject Notes & Marks
  ├─ Browse Resources & Formulas
  ├─ Set Study Timer
  ├─ View Achievements
  └─ Manage Calendar & Deadlines
```

### Smart Model Routing
```
User sends a question
  ↓
Task classifier detects question type (coding / reasoning / general)
  ↓
Routes to best model:
  ├─ Coding → Llama 4 Maverick 17B
  ├─ Reasoning → Qwen3-32B → GPT-OSS-120B (fallback)
  └─ General → Llama 4 Maverick → Llama 4 Scout (fallback)
  ↓
API key rotation + automatic model failover on errors
```

---

## 🔧 Environment Variables

**Required:**
- `GROQ_API_KEY` — Primary Groq API key ([console.groq.com](https://console.groq.com))
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

**Optional:**
- `GROQ_API_KEY_2` — Backup key for load balancing / failover
- `SUPABASE_SERVICE_ROLE_KEY` — Required for server-side operations (account deletion)
- `NEXT_PUBLIC_SITE_URL` — Explicit site URL (defaults to `window.location.origin`)

---

## 🧪 Testing

Run tests:
```bash
npm run test
```

Test files are located in `src/test/`. The project uses **Vitest** with **Testing Library**.

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

**Important:** Add all environment variables to your Vercel project dashboard:
- `GROQ_API_KEY`, `GROQ_API_KEY_2`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (set to your production URL)

---

## 🐛 Troubleshooting

### "Missing GROQ_API_KEY" Error
- Create a `.env.local` file in the project root with `GROQ_API_KEY=your_key`
- Restart the dev server (`npm run dev`)

### Auth / Login Not Working
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Ensure Google Auth is enabled in your Supabase project
- Check that the auth callback URL is whitelisted in Supabase

### Quiz / Chat Not Working
- Verify your Groq API key is valid at [console.groq.com](https://console.groq.com)
- Check the browser console for API errors (F12 → Console)
- Add `GROQ_API_KEY_2` for automatic failover

### Health Check
Visit `/api/health` to diagnose environment configuration issues.

---

## 📝 License

Created by **Shrravan Balamurugan**

---

## 🤝 Contributing

Found a bug or have a suggestion? Feel free to open an issue or submit a pull request!

---

## 📞 Support

For issues or questions, reach out through:
- GitHub Issues: [Create an issue](https://github.com/Error403Allowed/Analogix/issues)
- Email: [Contact via GitHub profile]

---

**Happy learning with Analogix! 🚀**
