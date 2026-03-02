# Analogix

**Analogix** is a modern, analogy-based learning platform that helps students master complex concepts by connecting them to things they already care about—like gaming, sports, or music. Powered by Hugging Face AI, Analogix explains difficult topics using personalized analogies that make concepts stick.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 Features

### Core Learning
- **Dynamic Analogy Tutor ("Quizzy")**: Real-time AI conversations that explain complex subjects through personalized analogies
- **Interactive Quizzes**: Auto-generated practice questions based on your learning level
- **15+ Subjects**: Mathematics, Physics, Chemistry, Biology, English, History, Geography, Computing, Economics, Business, Commerce, PDHPE, Engineering, Medicine, and Languages

### Personalization
- **Personalized Onboarding**: Select your subjects, hobbies, and learning style
- **Grade-Level Adaptation**: Content adjusts to junior/middle/senior levels
- **Analogy Intensity Control**: Choose how many analogies you want in explanations (0-5 levels)

### Progress Tracking
- **Mastery Dashboard**: View statistics, streaks, and accuracy metrics
- **Achievement Badges**: Unlock rewards for milestones and learning achievements
- **Study Streaks**: Track consecutive days of learning
- **Subject Analytics**: See which subjects you're strongest in

### Organization
- **Calendar Integration**: Track upcoming exams and deadlines
- **ICS File Support**: Import events from your calendar apps
- **Quick Chat**: Fast questions without opening the full tutor

### Design
- **Dark Mode Default**: Eye-friendly dark theme with optional light mode
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile
- **Smooth Animations**: Framer Motion effects for polished interactions
- **Clean Messaging Interface**: Familiar chat-style conversation UI

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Next.js** - React framework and build system
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide Icons** - Beautiful icon library

## 🔄 Recent updates

- **Resources verified:** `src/data/resources.ts` now contains 110+ past papers and 120+ textbooks — all free and paywall-free.
- **State-filtered links:** Past-paper links use direct, subject-filtered government URLs (NESA/VCAA/QCAA/SCSA/TASC/BSSS) so users land on exact subject archives.
- **Reliability improvements:** Added an app-level fetch wrapper with retries, environment validation, and an `/api/health` endpoint to reduce "Failed to fetch" errors.
- **UI updates:** `ResourcesPage` and `FormulasPage` support state-aware filtering so students see papers relevant to their state and subject quickly.

### Backend & API
- **Hugging Face Inference API** - AI model hosting
- **OpenAI-compatible Chat Interface** - Easy model switching
- **Llama 3.1 8B Instruct** - Primary language model

### State & Storage
- **React Query (TanStack)** - Data fetching & caching
- **Browser LocalStorage** - Persistent user data
- **Next App Router** - File-based routing

### UI Components
- **shadcn-ui** - Headless component library
- **Sonner** - Toast notifications
- **React-use-toast** - Toast management

### Utilities
- **ical.js** - Calendar file parsing
- **date-fns** - Date manipulation
- **clsx** - Conditional CSS classes

---

## 📦 Installation & Setup

### Prerequisites
- **Node.js** v18+ (check with `node --version`)
- **npm** or **bun** package manager
- **Hugging Face API Key** (get one at [huggingface.co](https://huggingface.co))

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

3. **Create `.env.local` file** in the project root:
   ```env
   HF_API_KEY=your_huggingface_api_key_here
   HF_API_KEY_2=optional_backup_key_for_rotation
   HF_CHAT_MODEL=mistralai/Mistral-7B-Instruct-v0.2
   HF_CHAT_MODEL_FALLBACKS=meta-llama/Meta-Llama-3.1-8B-Instruct
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for production:**
   ```bash
   npm run build
   npm run start    # Run production server locally
   ```

---

## 🗂️ Project Structure

```
Analogix/
├── app/
│   ├── layout.tsx              # Root layout + providers
│   ├── page.tsx                # Landing route
│   ├── dashboard/page.tsx      # Dashboard route
│   ├── chat/page.tsx           # Chat route
│   ├── quiz/page.tsx           # Quiz route
│   └── ...                     # Other app router routes
├── src/
│   ├── index.css               # Global styles & theme
│   ├── pages/
│   │   ├── Landing.tsx         # Homepage with theme rotation
│   │   ├── Onboarding.tsx      # User setup wizard
│   │   ├── Dashboard.tsx       # Main hub & statistics
│   │   ├── Chat.tsx            # AI tutor interface (Quizzy)
│   │   ├── Quiz.tsx            # Practice quiz mode
│   │   ├── AchievementsLibrary.tsx
│   │   ├── CalendarPage.tsx    # Event tracking
│   │   └── NotFound.tsx        # 404 page
│   ├── components/
│   │   ├── ui/                 # shadcn-ui components
│   │   ├── Header.tsx          # Navigation bar
│   │   ├── ThemeToggle.tsx     # Dark/Light mode switcher
│   │   ├── QuizCreator.tsx     # Quiz generation
│   │   ├── MarkdownRenderer.tsx# Markdown + LaTeX rendering
│   │   ├── TypewriterText.tsx  # Typing animation
│   │   └── [other components]
│   ├── services/
│   │   └── huggingface.ts      # Hugging Face API integration
│   ├── utils/
│   │   ├── statsStore.ts       # User statistics
│   │   ├── achievementStore.ts # Badge tracking
│   │   ├── eventStore.ts       # Calendar events
│   │   ├── mood.ts             # Mood/emotion system
│   │   └── [other utilities]
│   ├── constants/
│   │   └── subjects.tsx        # Subject catalog (15 subjects)
│   ├── types/
│   │   ├── chat.ts             # Chat message interfaces
│   │   ├── quiz.ts             # Quiz question types
│   │   └── [other types]
│   └── hooks/
│       └── custom React hooks
├── public/
├── README.md                   # This file
├── package.json
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 How It Works

### 1. **User Journey**
```
Landing Page
  ↓
Onboarding (Select subjects, hobbies, grade)
  ↓
Dashboard (View stats & quick access)
  ↓
Choose Activity:
  ├─ Chat with Quizzy (AI tutor)
  ├─ Take a Quiz
  ├─ View Achievements
  └─ Check Calendar
```

### 2. **Chat with Quizzy Flow**
```
1. User selects a subject
2. Quizzy sends personalized welcome message
3. User asks a question
4. getHuggingFaceCompletion() sends to Hugging Face API
5. AI generates analogy-based explanation
6. TypewriterMessage animates the response
7. User can copy, regenerate, or ask follow-up
```

### 3. **Quiz Generation**
```
1. generateQuiz() calls Hugging Face API
2. AI creates 3-5 questions with multiple choice options
3. QuizCreator renders interactive quiz UI
4. User selects answer → instant feedback
5. statsStore records accuracy score
6. Achievement checker looks for unlocked badges
```

---

## 🔑 Key Functions Reference

### AI & Chat (`src/services/huggingface.ts`)
- **`getHuggingFaceCompletion(messages, context)`** - Send chat messages, get AI responses
- **`generateQuiz(subject, grade, mood)`** - Create practice quiz questions
- **`getAIGreeting(name, streak, mood)`** - Personalized greeting message
- **`generateQuizOptions(question)`** - Multiple choice answers for a question

### User Data (`src/utils/statsStore.ts`)
- **`statsStore.get()`** - Retrieve user stats (quizzes, streaks, accuracy)
- **`statsStore.update(updates)`** - Save changes to user stats
- **`statsStore.recordChat(subject)`** - Log a chat conversation
- **`statsStore.addQuiz(score)`** - Record a quiz attempt

### Subjects & Content (`src/constants/subjects.tsx`)
- **`SUBJECT_CATALOG`** - Array of 15 subjects with icons
- **`getSubjectDescription(id, grade)`** - Get grade-appropriate description
- **`getGradeBand(grade)`** - Map grade number to junior/middle/senior

### Achievements (`src/utils/achievementStore.ts`)
- **`checkAchievements(stats)`** - Check if user unlocked new badges
- **`getAchievements()`** - Get all user achievements

---

## 🎨 Customization

### Change Landing Page Colors
Edit `src/pages/Landing.tsx` (lines 38-42):
```tsx
const themes = [
  { p: { h: "199.2", s: "78.2%", l: "48.3%" }, g: ["#0ea5a6", "#2563eb", "#0f766e"] }, // Coastal
  { p: { h: "147", s: "56%", l: "38%" }, g: ["#15803d", "#16a34a", "#0f766e"] }, // Forest
  { p: { h: "32", s: "76%", l: "52%" }, g: ["#f59e0b", "#f97316", "#ea580c"] }, // Amber
];
```

### Add a New Subject
1. Open `src/constants/subjects.tsx`
2. Import icon from `lucide-react`
3. Add to `SubjectId` union type
4. Add entry to `SUBJECT_CATALOG` array

Example:
```tsx
{
  id: "art",
  label: "Art & Design",
  icon: Palette,
  descriptions: {
    junior: "COLOR, COMPOSITION, EXPRESSION",
    middle: "TECHNIQUES, HISTORY, MOVEMENTS",
    senior: "CRITICISM, THEORY, CREATIVITY"
  }
}
```

### Modify AI Prompts
Edit `src/services/huggingface.ts` to change how Quizzy responds:
- System prompt at the top of `getHuggingFaceCompletion()`
- Quiz generation logic in `generateQuiz()`

---

## 🌙 Theme System

### Default Theme: Dark Mode
Set in `app/layout.tsx` line 22:
```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
```

### CSS Variables (`src/index.css`)
- `--primary` - Main accent color (changes per page load)
- `--foreground` - Text color
- `--background` - Page background
- `--card` - Card/container backgrounds
- `--muted` - Secondary/disabled text

---

## 📱 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🔧 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `HF_API_KEY` | ✅ Yes | Primary Hugging Face API key |
| `HF_API_KEY_2` | ❌ Optional | Backup key for load balancing |
| `HF_CHAT_MODEL` | ✅ Yes | Chat model used by the HF router |
| `HF_CHAT_MODEL_FALLBACKS` | ❌ Optional | Comma-separated fallback models |

Get your free API key at: https://huggingface.co/settings/tokens

---

## 📊 State Management

Analogix uses a lightweight state strategy:
- **LocalStorage**: Persistent user preferences, stats, and achievements
- **React useState**: Component-level UI state
- **React Context**: Theme provider
- **Custom Stores**: `statsStore`, `achievementStore`, `eventStore`
- **React Query**: API caching (if needed)

No Redux/Zustand needed for this app size!

---

## 🧪 Testing

Run tests:
```bash
npm run test
```

Test files located in `src/test/`

To quickly sanity-check a single filtered resource URL from the terminal (example):
```bash
curl -I "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-resources?resource_types=HSC%20exam%20pack%2CArchive%20HSC%20exam%20pack&category=Mathematics"
```
Or ask me and I can add a small Node script to verify all `src/data/resources.ts` URLs automatically.

---

## 🐛 Troubleshooting

### "Missing HF API Key" Error
- Create a `.env.local` file in the project root
- Add:
```env
HF_API_KEY=your_key_here
HF_API_KEY_2=optional_backup
HF_CHAT_MODEL=mistralai/Mistral-7B-Instruct-v0.2
HF_CHAT_MODEL_FALLBACKS=meta-llama/Meta-Llama-3.1-8B-Instruct
```
- Restart dev server (`npm run dev`)

### Dark Mode Not Working
- Check `app/layout.tsx` line 22: should have `defaultTheme="dark"`
- Clear browser cache and localStorage
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### Quiz Not Generating
- Verify Hugging Face API key is valid
- Check console for API errors (F12 → Console tab)
- Ensure subject exists in `SUBJECT_CATALOG`

### Chat Messages Not Appearing
- Check network tab (F12 → Network) for API calls
- Verify Hugging Face API key has access to chat models
- Check if rate limit reached (add `HF_API_KEY_2` for backup)

---

## 📈 Performance

- **Next.js**: Hybrid rendering, routing, and build tooling
- **Code Splitting**: Page components lazy-loaded
- **Image Optimization**: Lucide icons (SVG)
- **CSS**: Tailwind purges unused styles in production
- **Animations**: GPU-accelerated with Framer Motion

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Deploy to Any Static Host
```bash
npm run build
# Upload `dist/` folder to your host
```

**Important:** Add environment variables to your hosting platform's dashboard:
- `HF_API_KEY=your_key`
- `HF_API_KEY_2=optional_backup`

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
