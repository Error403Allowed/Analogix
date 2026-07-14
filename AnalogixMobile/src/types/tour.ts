import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
}

export interface TourConfig {
  id: string;
  storageKey: string;
  steps: TourStep[];
  autoShow?: boolean;
}

const TOURS: TourConfig[] = [
  {
    id: "dashboard",
    storageKey: "tour_dashboard_seen",
    autoShow: true,
    steps: [
      { target: "dashboard-main", title: "Welcome!", description: "Your personalised dashboard shows everything at a glance." },
      { target: "streak-strip", title: "Streak", description: "Track your study streak and stay consistent." },
      { target: "quick-chat", title: "AI Tutor", description: "Quick-ask the AI a question right from your dashboard." },
      { target: "recent-docs", title: "Recent Docs", description: "Jump back into your recent documents." },
      { target: "today-events", title: "Today", description: "See your events and deadlines for today." },
    ],
  },
  {
    id: "chatlist",
    storageKey: "tour_chatlist_seen",
    autoShow: true,
    steps: [
      { target: "chatlist-header", title: "AI Tutor", description: "Chat with your personalised AI tutor about any subject." },
      { target: "new-chat-btn", title: "New Chat", description: "Start a new conversation to ask questions or explore topics." },
      { target: "search-chats", title: "Search", description: "Search through your past conversations." },
    ],
  },
  {
    id: "flashcards",
    storageKey: "tour_flashcards_seen",
    autoShow: true,
    steps: [
      { target: "flashcards-header", title: "Flashcards", description: "Study with AI-generated or custom flashcards." },
      { target: "create-set", title: "New Set", description: "Create a new flashcard set for any subject." },
      { target: "ai-generate", title: "AI Generate", description: "Let AI generate flashcards from your notes or topic." },
    ],
  },
  {
    id: "quiz",
    storageKey: "tour_quiz_seen",
    autoShow: true,
    steps: [
      { target: "quiz-header", title: "Quiz Hub", description: "Test your knowledge with AI-generated quizzes." },
      { target: "generate-quiz", title: "Generate", description: "Configure subject, difficulty, and question count." },
      { target: "import-content", title: "Import", description: "Generate a quiz from a document or pasted text." },
    ],
  },
  {
    id: "calendar",
    storageKey: "tour_calendar_seen",
    autoShow: true,
    steps: [
      { target: "calendar-header", title: "Calendar", description: "Keep track of exams, assignments, and events." },
      { target: "calendar-views", title: "Views", description: "Switch between month, week, day, and list views." },
      { target: "add-event", title: "Add Event", description: "Create events and deadlines or import your school timetable." },
    ],
  },
  {
    id: "studyhub",
    storageKey: "tour_studyhub_seen",
    autoShow: true,
    steps: [
      { target: "studyhub-header", title: "Study Hub", description: "All your study tools in one place." },
      { target: "study-tools", title: "Tools", description: "Flashcards, quizzes, formulas, timer, and more." },
    ],
  },
  {
    id: "rooms",
    storageKey: "tour_rooms_seen",
    autoShow: true,
    steps: [
      { target: "rooms-header", title: "Study Rooms", description: "Study together in real-time with friends." },
      { target: "join-room", title: "Join", description: "Join a room with an invite code." },
      { target: "create-room", title: "Create", description: "Create a new study room for group sessions." },
    ],
  },
  {
    id: "profile",
    storageKey: "tour_profile_seen",
    autoShow: true,
    steps: [
      { target: "profile-header", title: "Profile", description: "Manage your account, stats, and preferences." },
      { target: "profile-stats", title: "Stats", description: "Track your XP, quiz completions, and cards reviewed." },
      { target: "ai-settings", title: "AI Settings", description: "Customise your AI tutor's personality and memory." },
    ],
  },
];

export function getTourForPath(path: string): TourConfig | null {
  const map: Record<string, string> = {
    Dashboard: "dashboard",
    ChatList: "chatlist",
    Flashcards: "flashcards",
    Quiz: "quiz",
    Calendar: "calendar",
    StudyHub: "studyhub",
    RoomsList: "rooms",
    ProfileHome: "profile",
  };
  const tourId = map[path];
  return TOURS.find((t) => t.id === tourId) ?? null;
}

export async function hasSeenTour(storageKey: string): Promise<boolean> {
  const val = await AsyncStorage.getItem(storageKey);
  return val === "true";
}
