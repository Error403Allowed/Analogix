import AsyncStorage from "@react-native-async-storage/async-storage";

export async function hasSeenTour(storageKey: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(storageKey);
    return val === "true";
  } catch {
    return false;
  }
}

export async function markTourAsSeen(storageKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey, "true");
  } catch {
    /* ignore */
  }
}

export interface TourStep {
  id: string;
  title: string;
  content: string;
  icon?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export interface TourConfig {
  id: string;
  name: string;
  steps: TourStep[];
  autoShow?: boolean;
  storageKey: string;
}

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
        content: "Your personal study OS. Notes, flashcards, quizzes, and AI tutoring — all in one place.",
        icon: "🎯",
      },
      {
        id: "stats",
        title: "Your Stats",
        content: "Track your streaks, quiz accuracy, and study activity at a glance.",
        icon: "📊",
      },
      {
        id: "quick-actions",
        title: "Quick Actions",
        content: "Jump straight into studying. Start an AI chat, generate flashcards, or launch a quiz.",
        icon: "⚡",
      },
      {
        id: "widgets",
        title: "Customise",
        content: "Tap the settings icon to rearrange or hide widgets. Make your dashboard work for you.",
        icon: "🎛️",
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
        content: "Ask anything — explain a concept, quiz you on a topic, or summarise your notes.",
        icon: "💬",
      },
      {
        id: "model-selector",
        title: "Pick a Model",
        content: "Choose the AI model for your query. Auto picks the best one for the task.",
        icon: "🧠",
      },
      {
        id: "research-mode",
        title: "Research Mode",
        content: "Need academic sources? This pulls citations from research papers for essays.",
        icon: "📑",
      },
      {
        id: "input",
        title: "Try It Out",
        content: "Type any question below. The more specific you are, the better the answer.",
        icon: "✍️",
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
        content: "The most efficient way to memorise. Cards are scheduled so you see each one right before you'd forget it.",
        icon: "🧠",
      },
      {
        id: "create",
        title: "Create Decks",
        content: "Make decks manually or let AI generate them from your notes, docs, or chat conversations.",
        icon: "✨",
      },
      {
        id: "study",
        title: "Study Mode",
        content: "Open any deck and rate each card. Hard cards come back sooner, easy ones get pushed out.",
        icon: "📚",
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
        content: "AI generates custom quizzes on any topic. Pick your difficulty and number of questions.",
        icon: "🎯",
      },
      {
        id: "create",
        title: "Generate a Quiz",
        content: "Enter a topic or upload notes. AI creates questions matched to your year level.",
        icon: "⚡",
      },
      {
        id: "review",
        title: "Learn From Mistakes",
        content: "After each quiz, review every question with detailed AI explanations.",
        icon: "📊",
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
        content: "All your deadlines, exams, and study sessions in one view. Colour-coded by subject.",
        icon: "🗓️",
      },
      {
        id: "add-event",
        title: "Add Events",
        content: "Manually add assignments, exams, or study blocks. Set priority levels and reminders.",
        icon: "➕",
      },
      {
        id: "deadlines",
        title: "Deadlines",
        content: "Track upcoming deadlines with priority levels. Never miss a due date again.",
        icon: "⏰",
      },
    ],
  },
  rooms: {
    id: "rooms",
    name: "Study Rooms",
    storageKey: "tour_rooms_seen",
    autoShow: true,
    steps: [
      {
        id: "welcome",
        title: "Study Together",
        content: "Create or join study rooms to learn with friends in real-time.",
        icon: "🏠",
      },
      {
        id: "create",
        title: "Create a Room",
        content: "Start a study room with a shared timer, chat, and collaborative features.",
        icon: "➕",
      },
      {
        id: "join",
        title: "Join with Code",
        content: "Share your room code with friends so they can join instantly.",
        icon: "🔑",
      },
    ],
  },
};

export const getTourForPath = (pathname: string): TourConfig | null => {
  const pathToTour: Record<string, string> = {
    Dashboard: "dashboard",
    ChatList: "chat",
    ChatSession: "chat",
    Flashcards: "flashcards",
    Quiz: "quiz",
    Calendar: "calendar",
    RoomsList: "rooms",
    RoomDetail: "rooms",
  };
  return PAGE_TOURS[pathToTour[pathname]] ?? null;
};
