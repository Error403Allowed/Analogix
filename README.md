# Analogix

Analogix is a modern, analogy-based learning platform designed to help students
master complex concepts by connecting them to things they already love—like
gaming, sports, or music.

## Features

- **Personalized Onboarding**: Tailor your learning experience by selecting your
  subjects and hobbies.
- **Dynamic Analogy Tutor**: Interact with "Quizzy," an AI-powered tutor that
  explains difficult topics using personalized analogies.
- **Interactive Quizzes**: Test your knowledge with analogy-based questions
  generated on the fly.
- **Achievements & Badges**: Earn rewards as you master new subjects and
  maintain study streaks.
- **Schedule & Deadlines**: Manage your upcoming exams and milestones with a
  built-in calendar and ICS import support.
- **Mastery Dashboard**: Track your progress, accuracy, and streaks in one
  central hub.

## Tech Stack

- **Frontend**: React, Vite, TypeScript
- **Styling**: Tailwind CSS, Framer Motion, Lucide icons
- **State Management**: React Query, LocalStorage
- **UI Components**: shadcn-ui
- **AI Integration**: Groq API (Llama 3)
- **Utilities**: ical.js, date-fns

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository:
   ```sh
   git clone <YOUR_GIT_URL>
   ```

2. Navigate to the project directory:
   ```sh
   cd analogix
   ```

3. Install dependencies:
   ```sh
   npm install
   ```

4. Create a `.env` file in the root directory and add your Groq API key:
   ```env
   VITE_GROQ_API_KEY=your_api_key_here
   ```

5. Start the development server:
   ```sh
   npm run dev
   ```

## Development

- `npm run dev`: Starts the development server.
- `npm run build`: Generates the production build.
- `npm run preview`: Previews the production build locally.

## License

Created by Shrravan Balamurugan.
