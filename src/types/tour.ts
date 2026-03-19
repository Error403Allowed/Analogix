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
        title: "Welcome to Your Dashboard",
        content: "This is your command center for learning. Everything you need is right here.",
        position: "center",
      },
      {
        id: "subjects",
        title: "Your Subjects",
        content: "Access all your subjects here. Click any subject to view notes, flashcards, and quizzes.",
        targetSelector: "[data-tour='subjects-section']",
        position: "bottom",
      },
      {
        id: "quick-actions",
        title: "Quick Actions",
        content: "Jump straight into studying with these quick actions. Start a chat, create flashcards, or take a quiz.",
        targetSelector: "[data-tour='quick-actions']",
        position: "top",
      },
      {
        id: "calendar",
        title: "Upcoming Deadlines",
        content: "Never miss a deadline. Your assignments and exams are tracked here automatically.",
        targetSelector: "[data-tour='calendar-widget']",
        position: "top",
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
        title: "Meet Your AI Tutor",
        content: "Ask anything about your subjects. I'll explain concepts using analogies from your interests.",
        position: "center",
      },
      {
        id: "model-selector",
        title: "Choose Your Model",
        content: "Pick the AI model that fits your needs. Auto is recommended for most queries.",
        targetSelector: "[data-tour='model-selector']",
        position: "bottom",
      },
      {
        id: "analogy-toggle",
        title: "Analogy Mode",
        content: "Toggle analogies on/off. When on, I'll explain concepts using your hobbies and interests.",
        targetSelector: "[data-tour='analogy-toggle']",
        position: "top",
      },
      {
        id: "research-mode",
        title: "Research Mode",
        content: "Need academic sources? Enable this for citations from research papers.",
        targetSelector: "[data-tour='research-toggle']",
        position: "top",
      },
      {
        id: "input",
        title: "Start Learning",
        content: "Type any question below. Be specific for the best results!",
        targetSelector: "[data-tour='chat-input']",
        position: "top",
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
        title: "Your Study Calendar",
        content: "Track all your assignments, exams, and study sessions in one place.",
        position: "center",
      },
      {
        id: "import",
        title: "Import Your Schedule",
        content: "Upload your school timetable (.ics file) to automatically see all your classes and deadlines.",
        targetSelector: "[data-tour='calendar-import']",
        position: "bottom",
      },
      {
        id: "add-event",
        title: "Add Events",
        content: "Manually add assignments, exams, or study sessions. Set reminders so you never forget.",
        targetSelector: "[data-tour='add-event']",
        position: "top",
      },
      {
        id: "study-schedule",
        title: "Auto Study Plans",
        content: "Get AI-generated study schedules before your exams. Just add your exam dates!",
        targetSelector: "[data-tour='study-schedule']",
        position: "top",
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
        title: "Flashcards for Active Recall",
        content: "Test yourself with spaced repetition. The best way to memorize key concepts.",
        position: "center",
      },
      {
        id: "create",
        title: "Create Flashcards",
        content: "Make your own or let AI generate them from your notes or chat conversations.",
        targetSelector: "[data-tour='create-flashcards']",
        position: "top",
      },
      {
        id: "study",
        title: "Study Mode",
        content: "Click any deck to start studying. Rate how well you knew each card for optimal spacing.",
        targetSelector: "[data-tour='flashcard-decks']",
        position: "top",
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
        title: "Test Your Knowledge",
        content: "Generate custom quizzes on any topic. Perfect for exam prep.",
        position: "center",
      },
      {
        id: "create",
        title: "Create a Quiz",
        content: "Enter a topic or upload notes. AI will generate questions tailored to your level.",
        targetSelector: "[data-tour='create-quiz']",
        position: "bottom",
      },
      {
        id: "review",
        title: "Review & Learn",
        content: "After each quiz, get detailed explanations for every question. Learn from mistakes.",
        targetSelector: "[data-tour='quiz-history']",
        position: "top",
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
        title: "Your Document Library",
        content: "Store all your study materials here. Notes, PDFs, and AI-generated guides.",
        position: "center",
      },
      {
        id: "upload",
        title: "Upload Documents",
        content: "Add your class notes, textbooks, or any study material. AI can help summarize them.",
        targetSelector: "[data-tour='upload-doc']",
        position: "bottom",
      },
      {
        id: "ai-chat",
        title: "Chat with Documents",
        content: "Ask questions about your uploaded docs. Get instant answers with citations.",
        targetSelector: "[data-tour='doc-chat']",
        position: "top",
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
