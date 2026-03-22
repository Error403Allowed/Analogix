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
 * Page-specific tours - shown when user visits a page for the first time
 */
export const PAGE_TOURS: Record<string, TourConfig> = {
  dashboard: {
    id: "dashboard",
    name: "Dashboard Overview",
    storageKey: "tour_dashboard_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "👋 Welcome to Your Dashboard",
        content: "This is your command center for learning. Everything you need is right here.",
        position: "center",
        icon: "🎯",
        pulse: true,
      },
      {
        id: "subjects",
        title: "📚 Your Subjects",
        content: "Access all your subjects here. Click any subject to view notes, flashcards, and quizzes.",
        targetSelector: "[data-tour='subjects-section']",
        position: "bottom",
        icon: "📖",
        hint: "Click to explore",
        pulse: true,
      },
      {
        id: "quick-actions",
        title: "⚡ Quick Actions",
        content: "Jump straight into studying with these quick actions. Start a chat, create flashcards, or take a quiz.",
        targetSelector: "[data-tour='quick-actions']",
        position: "top",
        icon: "🚀",
        hint: "Fast access",
        pulse: true,
      },
      {
        id: "calendar",
        title: "📅 Upcoming Deadlines",
        content: "Never miss a deadline. Your assignments and exams are tracked here automatically.",
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
    name: "AI Chat Guide",
    storageKey: "tour_chat_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "🤖 Meet Your AI Tutor",
        content: "Ask anything about your subjects. I'll explain concepts using analogies from your interests.",
        position: "center",
        icon: "💬",
        pulse: true,
      },
      {
        id: "model-selector",
        title: "🧠 Choose Your Model",
        content: "Pick the AI model that fits your needs. Auto is recommended for most queries.",
        targetSelector: "[data-tour='model-selector']",
        position: "bottom",
        icon: "⚙️",
        hint: "Select model",
        pulse: true,
      },
      {
        id: "analogy-toggle",
        title: "💡 Analogy Mode",
        content: "Toggle analogies on/off. When on, I'll explain concepts using your hobbies and interests.",
        targetSelector: "[data-tour='analogy-toggle']",
        position: "top",
        icon: "🎨",
        hint: "Make it relatable",
        pulse: true,
      },
      {
        id: "research-mode",
        title: "🔬 Research Mode",
        content: "Need academic sources? Enable this for citations from research papers.",
        targetSelector: "[data-tour='research-toggle']",
        position: "top",
        icon: "📑",
        hint: "Get citations",
        pulse: true,
      },
      {
        id: "input",
        title: "✍️ Start Learning",
        content: "Type any question below. Be specific for the best results!",
        targetSelector: "[data-tour='chat-input']",
        position: "top",
        icon: "💭",
        hint: "Ask away!",
        pulse: true,
      },
    ],
  },
  calendar: {
    id: "calendar",
    name: "Calendar Setup",
    storageKey: "tour_calendar_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "📆 Your Study Calendar",
        content: "Track all your assignments, exams, and study sessions in one place.",
        position: "center",
        icon: "🗓️",
        pulse: true,
      },
      {
        id: "import",
        title: "📥 Import Your Schedule",
        content: "Upload your school timetable (.ics file) to automatically see all your classes and deadlines.",
        targetSelector: "[data-tour='calendar-import']",
        position: "bottom",
        icon: "⬇️",
        hint: "Upload .ics",
        pulse: true,
      },
      {
        id: "add-event",
        title: "➕ Add Events",
        content: "Manually add assignments, exams, or study sessions. Set reminders so you never forget.",
        targetSelector: "[data-tour='add-event']",
        position: "top",
        icon: "📝",
        hint: "Create event",
        pulse: true,
      },
      {
        id: "study-schedule",
        title: "📋 Auto Study Plans",
        content: "Get AI-generated study schedules before your exams. Just add your exam dates!",
        targetSelector: "[data-tour='study-schedule']",
        position: "top",
        icon: "🤖",
        hint: "AI-powered",
        pulse: true,
      },
    ],
  },
  flashcards: {
    id: "flashcards",
    name: "Flashcards Guide",
    storageKey: "tour_flashcards_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "🃏 Flashcards for Active Recall",
        content: "Test yourself with spaced repetition. The best way to memorize key concepts.",
        position: "center",
        icon: "🧠",
        pulse: true,
      },
      {
        id: "create",
        title: "✨ Create Flashcards",
        content: "Make your own or let AI generate them from your notes or chat conversations.",
        targetSelector: "[data-tour='create-flashcards']",
        position: "top",
        icon: "➕",
        hint: "Generate with AI",
        pulse: true,
      },
      {
        id: "study",
        title: "📖 Study Mode",
        content: "Click any deck to start studying. Rate how well you knew each card for optimal spacing.",
        targetSelector: "[data-tour='flashcard-decks']",
        position: "top",
        icon: "📚",
        hint: "Start studying",
        pulse: true,
      },
    ],
  },
  quiz: {
    id: "quiz",
    name: "Quiz Guide",
    storageKey: "tour_quiz_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "📝 Test Your Knowledge",
        content: "Generate custom quizzes on any topic. Perfect for exam prep.",
        position: "center",
        icon: "🎯",
        pulse: true,
      },
      {
        id: "create",
        title: "🆕 Create a Quiz",
        content: "Enter a topic or upload notes. AI will generate questions tailored to your level.",
        targetSelector: "[data-tour='create-quiz']",
        position: "bottom",
        icon: "⚡",
        hint: "AI-generated",
        pulse: true,
      },
      {
        id: "review",
        title: "📊 Review & Learn",
        content: "After each quiz, get detailed explanations for every question. Learn from mistakes.",
        targetSelector: "[data-tour='quiz-history']",
        position: "top",
        icon: "📈",
        hint: "Track progress",
        pulse: true,
      },
    ],
  },
  resources: {
    id: "resources",
    name: "Resources Guide",
    storageKey: "tour_resources_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "📁 Your Document Library",
        content: "Store all your study materials here. Notes, PDFs, and AI-generated guides.",
        position: "center",
        icon: "🗂️",
        pulse: true,
      },
      {
        id: "upload",
        title: "📤 Upload Documents",
        content: "Add your class notes, textbooks, or any study material. AI can help summarize them.",
        targetSelector: "[data-tour='upload-doc']",
        position: "bottom",
        icon: "⬆️",
        hint: "Drag & drop",
        pulse: true,
      },
      {
        id: "ai-chat",
        title: "💬 Chat with Documents",
        content: "Ask questions about your uploaded docs. Get instant answers with citations.",
        targetSelector: "[data-tour='doc-chat']",
        position: "top",
        icon: "🤖",
        hint: "Ask AI",
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
