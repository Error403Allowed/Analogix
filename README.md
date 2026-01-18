# Analogix - AI-Powered Learning for Australian Students

Analogix is an intelligent tutoring platform that explains curriculum concepts using personalized analogies from students' interests. Built for Australian students in Years 7–12, it provides ACARA-aligned content with exam-ready explanations.

## 🎯 Features

- **Personalized Analogies**: Learn physics through F1 racing, maths through Minecraft, or history through your favorite movies
- **Curriculum Aligned**: All content follows ACARA standards and state-specific syllabuses (NESA for NSW, VCAA for VIC, etc.)
- **Exam Ready**: Every explanation includes exam-style practice questions and common pitfalls to avoid
- **Multi-Subject Support**: Mathematics, Physics, Chemistry, Biology, English, History, Geography, and more
- **Adaptive Learning**: AI tutor adapts explanations based on year level, state, selected subjects, and personal interests

## 🚀 Getting Started

### Prerequisites
- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd curriculum-connector

# Install dependencies
npm i

# Start the development server
npm run dev
```

The app will be available at `http://localhost:8080`

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── ChatInterface.tsx      # Main tutoring chat interface
│   ├── OnboardingFlow.tsx      # Student profile setup
│   ├── LandingHero.tsx         # Landing page
│   └── ui/                     # shadcn-ui components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
│   └── storage.ts       # Student profile storage
├── pages/               # Page components
└── test/                # Test setup and utilities

supabase/
└── functions/tutor-chat/  # Edge function for AI responses
```

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn-ui
- **Build Tool**: Vite
- **Testing**: Vitest
- **Backend**: Supabase (Edge Functions)
- **AI Integration**: Lovable API for intelligent tutoring

## 📝 Available Scripts

```sh
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run build:dev    # Build in development mode
npm run lint         # Run ESLint
npm run preview      # Preview production build
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
```

## 🎓 How It Works

1. **Onboarding**: Students complete a flow to set their year level, state, subjects, and interests
2. **Profile Storage**: Profile data is saved to localStorage for persistence
3. **AI Tutoring**: The chat interface sends questions along with the student profile to the Supabase Edge Function
4. **Smart Responses**: The AI tutor generates curriculum-aligned explanations using personalized analogies from the student's interests
5. **Continuous Learning**: The conversation history is maintained for context-aware follow-up questions

## 📚 Student Profile

The app stores the following student information:

- **Year Level**: Year 7 through Year 12
- **State/Territory**: NSW, VIC, QLD, WA, SA, TAS, ACT, NT
- **Subjects**: Selected curriculum subjects (Mathematics, Physics, Chemistry, Biology, English, History, Geography, etc.)
- **Interests**: At least 3 personal interests used for generating analogies (gaming, sports, music, movies, etc.)

## 🔐 Environment Variables

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_SUPABASE_URL=your_supabase_url
```

## 📦 Deployment

### Deploy to Production

```sh
npm run build
```

Then deploy via Lovable:
1. Open [Lovable Dashboard](https://lovable.dev)
2. Navigate to your project
3. Click Share → Publish

### Connect a Custom Domain

1. Go to Project > Settings > Domains
2. Click "Connect Domain"
3. Follow the configuration steps

[Learn more about custom domains](https://docs.lovable.dev/features/custom-domain#custom-domain)

## 🧪 Testing

Run the test suite:

```sh
npm run test          # Run all tests
npm run test:watch    # Watch mode for development
```

Tests use Vitest with jsdom environment and are located alongside components with `.test.ts` or `.spec.ts` extensions.

## 🤝 Contributing

This project is managed through Lovable and GitHub:

1. **Via Lovable**: Visit your [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and prompt for changes
2. **Via IDE**: Clone the repo, make changes locally, and push to GitHub
3. **Direct GitHub Edit**: Edit files directly in the GitHub web interface

Changes are automatically synchronized between Lovable and this repository.

## 📄 License

This project is part of the Lovable platform ecosystem.

---

**Built for Australian students, Years 7–12** 🇦🇺📚
