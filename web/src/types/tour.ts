/**
 * Tour step configuration
 */
export interface TourStep {
  /** Unique ID for this step */
  id: string;
  /** Title shown at the top of the step */
  title: string;
  /** Main content/description for the step */
  content: string;
  /** CSS selector for the element to highlight (optional) */
  targetSelector?: string;
  /** Position of the tooltip relative to the target */
  position?: "top" | "bottom" | "left" | "right" | "center";
  /** Icon to display in the step (emoji or lucide icon name) */
  icon?: string;
  /** Optional action button to show on this step */
  action?: {
    label: string;
    onClick: () => void;
    icon?: string;
  };
  /** Additional hint text shown near the highlighted element */
  hint?: string;
  /** Whether to pulse the highlighted element */
  pulse?: boolean;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
}

/**
 * Complete tour configuration
 */
export interface TourConfig {
  /** Unique ID for this tour */
  id: string;
  /** Display name for the tour */
  name: string;
  /** Array of steps in order */
  steps: TourStep[];
  /** Whether this tour should auto-show on first page visit */
  autoShow?: boolean;
  /** LocalStorage key to track if tour was completed */
  storageKey: string;
}

/**
 * Page-specific tours — Premium, engaging, contextual
 */
export const PAGE_TOURS: Record<string, TourConfig> = {
  dashboard: {
    id: "dashboard",
    name: "Your Command Center",
    storageKey: "tour_dashboard_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "Welcome to Analogix",
        content: "Your personal study OS. Notes, flashcards, quizzes, and AI tutoring — all in one place. Let's take a quick tour.",
        position: "center",
        icon: "🎯",
        pulse: true,
      },
      {
        id: "subjects",
        title: "Your Subjects",
        content: "Tap any subject to open your notes. Each one has its own flashcards, quizzes, and AI chat — all auto-organized.",
        targetSelector: "[data-tour='subjects-section']",
        position: "bottom",
        icon: "📖",
        hint: "Tap to explore",
        pulse: true,
      },
      {
        id: "quick-actions",
        title: "Quick Actions",
        content: "Jump straight into studying. Start an AI chat, generate flashcards, or launch a quiz — one tap away.",
        targetSelector: "[data-tour='quick-actions']",
        position: "top",
        icon: "⚡",
        hint: "One-tap access",
        pulse: true,
      },
      {
        id: "calendar",
        title: "Deadlines & Events",
        content: "Never miss a due date. Your assignments and exams are tracked here with automatic reminders.",
        targetSelector: "[data-tour='calendar-widget']",
        position: "top",
        icon: "⏰",
        hint: "Stay on track",
        pulse: true,
      },
    ],
  },
  chat: {
    id: "chat",
    name: "AI Tutor",
    storageKey: "tour_chat_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "Your AI Tutor",
        content: "Ask anything — explain a concept, quiz you on a topic, or summarize your notes. It adapts to your level and interests.",
        position: "center",
        icon: "💬",
        pulse: true,
      },
      {
        id: "model-selector",
        title: "Pick a Model",
        content: "Choose the AI model for your query. Auto picks the best one. Use heavier models for complex reasoning.",
        targetSelector: "[data-tour='model-selector']",
        position: "bottom",
        icon: "🧠",
        hint: "Choose wisely",
        pulse: true,
      },
      {
        id: "analogy-toggle",
        title: "Analogy Mode",
        content: "Turn this on and explanations use your hobbies and interests. Physics explained through gaming? Yes.",
        targetSelector: "[data-tour='analogy-toggle']",
        position: "top",
        icon: "🎮",
        hint: "Make it click",
        pulse: true,
      },
      {
        id: "research-mode",
        title: "Research Mode",
        content: "Need academic sources? This pulls citations from research papers. Great for essays and assignments.",
        targetSelector: "[data-tour='research-toggle']",
        position: "top",
        icon: "📑",
        hint: "Get citations",
        pulse: true,
      },
      {
        id: "input",
        title: "Try It Out",
        content: "Type any question below. The more specific you are, the better the answer. Go ahead — ask something.",
        targetSelector: "[data-tour='chat-input']",
        position: "top",
        icon: "✍️",
        hint: "Ask anything",
        pulse: true,
      },
    ],
  },
  calendar: {
    id: "calendar",
    name: "Study Calendar",
    storageKey: "tour_calendar_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "Your Study Calendar",
        content: "All your deadlines, exams, and study sessions in one view. Color-coded by subject so nothing slips through.",
        position: "center",
        icon: "🗓️",
        pulse: true,
      },
      {
        id: "import",
        title: "Import Schedule",
        content: "Got a school timetable? Upload the .ics file and it'll auto-populate your calendar with classes and deadlines.",
        targetSelector: "[data-tour='calendar-import']",
        position: "bottom",
        icon: "📥",
        hint: "Upload .ics",
        pulse: true,
      },
      {
        id: "add-event",
        title: "Add Events",
        content: "Manually add assignments, exams, or study blocks. Set priority levels and reminders so you're always prepared.",
        targetSelector: "[data-tour='add-event']",
        position: "top",
        icon: "➕",
        hint: "Create event",
        pulse: true,
      },
      {
        id: "study-schedule",
        title: "AI Study Plans",
        content: "Add an exam date and AI builds a week-by-week study plan leading up to it. No more cramming.",
        targetSelector: "[data-tour='study-schedule']",
        position: "top",
        icon: "🤖",
        hint: "Auto-generated",
        pulse: true,
      },
    ],
  },
  flashcards: {
    id: "flashcards",
    name: "Flashcards",
    storageKey: "tour_flashcards_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "Flashcards & Spaced Repetition",
        content: "The most efficient way to memorize. Cards are scheduled using SM-2 algorithm — you see each one right before you'd forget it.",
        position: "center",
        icon: "🧠",
        pulse: true,
      },
      {
        id: "create",
        title: "Create Decks",
        content: "Make decks manually or let AI generate them from your notes, uploaded docs, or chat conversations.",
        targetSelector: "[data-tour='create-flashcards']",
        position: "top",
        icon: "✨",
        hint: "AI-powered",
        pulse: true,
      },
      {
        id: "study",
        title: "Study Mode",
        content: "Open any deck and rate each card 1–5. Hard cards come back sooner, easy ones get pushed out. It's science.",
        targetSelector: "[data-tour='flashcard-decks']",
        position: "top",
        icon: "📚",
        hint: "Start reviewing",
        pulse: true,
      },
    ],
  },
  quiz: {
    id: "quiz",
    name: "Quizzes",
    storageKey: "tour_quiz_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "Test Yourself",
        content: "AI generates custom quizzes on any topic. Pick your difficulty, number of questions, and whether you want a timer.",
        position: "center",
        icon: "🎯",
        pulse: true,
      },
      {
        id: "create",
        title: "Generate a Quiz",
        content: "Enter a topic or upload notes. AI creates questions matched to your year level. Instant feedback with explanations.",
        targetSelector: "[data-tour='create-quiz']",
        position: "bottom",
        icon: "⚡",
        hint: "Try it now",
        pulse: true,
      },
      {
        id: "review",
        title: "Learn From Mistakes",
        content: "After each quiz, review every question with detailed explanations. Your weak spots get flagged for follow-up.",
        targetSelector: "[data-tour='quiz-history']",
        position: "top",
        icon: "📊",
        hint: "Track progress",
        pulse: true,
      },
    ],
  },
  resources: {
    id: "resources",
    name: "Document Library",
    storageKey: "tour_resources_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "Your Document Library",
        content: "Upload PDFs, Word docs, or paste text. AI can summarize, generate flashcards, or create quizzes from any document.",
        position: "center",
        icon: "🗂️",
        pulse: true,
      },
      {
        id: "upload",
        title: "Upload Anything",
        content: "Drag and drop or browse. Supports PDF, DOCX, TXT, and markdown. Processing takes a few seconds.",
        targetSelector: "[data-tour='upload-doc']",
        position: "bottom",
        icon: "📤",
        hint: "Drop files here",
        pulse: true,
      },
      {
        id: "ai-chat",
        title: "Chat with Docs",
        content: "Ask questions about any uploaded document. Get instant answers with page citations. It's like having a tutor who read everything.",
        targetSelector: "[data-tour='doc-chat']",
        position: "top",
        icon: "💬",
        hint: "Ask the doc",
        pulse: true,
      },
    ],
  },
};

/**
 * Get tour config for a specific page path
 */
export const getTourForPath = (pathname: string): TourConfig | null => {
  // Map paths to tour keys
  const pathToTour: Record<string, string> = {
    "/dashboard": "dashboard",
    "/chat": "chat",
    "/calendar": "calendar",
    "/flashcards": "flashcards",
    "/quiz": "quiz",
    "/resources": "resources",
  };

  // Check for exact match first
  if (pathToTour[pathname]) {
    return PAGE_TOURS[pathToTour[pathname]] || null;
  }

  // Check for nested routes (e.g., /subjects/math)
  for (const [prefix, tourKey] of Object.entries(pathToTour)) {
    if (pathname.startsWith(prefix + "/")) {
      return PAGE_TOURS[tourKey] || null;
    }
  }

  return null;
};

/**
 * Check if a tour has been seen
 */
export const hasSeenTour = (storageKey: string): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(storageKey) === "true";
};

/**
 * Mark a tour as seen
 */
export const markTourAsSeen = (storageKey: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, "true");
};

/**
 * Reset a tour (for testing or user preference)
 */
export const resetTour = (storageKey: string): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey);
};

/**
 * Reset all tours (for replay from settings)
 */
export const resetAllTours = (): void => {
  if (typeof window === "undefined") return;
  Object.values(PAGE_TOURS).forEach((tour) => {
    localStorage.removeItem(tour.storageKey);
  });
};

/**
 * Check if all tours have been seen
 */
export const haveAllToursBeenSeen = (): boolean => {
  if (typeof window === "undefined") return false;
  return Object.values(PAGE_TOURS).every((tour) => 
    localStorage.getItem(tour.storageKey) === "true"
  );
};
