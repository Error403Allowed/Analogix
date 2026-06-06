/**
 * Navigation type definitions. Centralized so every screen imports from here.
 */
import type { NavigatorScreenParams } from "@react-navigation/native";

// -----------------------------------------------------------------------------
// Tab: Home (Dashboard stack)
// -----------------------------------------------------------------------------
export type HomeStackParamList = {
  Dashboard: undefined;
  SubjectDetail: { subjectId: string; name?: string };
  DocumentEditor: { subjectId: string; documentId: string };
  Achievements: undefined;
};

// -----------------------------------------------------------------------------
// Tab: Tutor (Chat stack)
// -----------------------------------------------------------------------------
export type TutorStackParamList = {
  ChatList: { subjectId?: string } | undefined;
  ChatSession: { sessionId: string; subjectId: string; title?: string };
};

// -----------------------------------------------------------------------------
// Tab: Study (multiple sub-stacks via nested navigation)
// -----------------------------------------------------------------------------
export type StudyStackParamList = {
  StudyHome: undefined;
  Flashcards: { subjectId?: string } | undefined;
  FlashcardReview: undefined;
  Quiz: { subjectId?: string } | undefined;
  QuizSession: { quizId: string; title: string };
  QuizResults: { quizId: string };
  Calendar: undefined;
  EventDetail: { eventId: string };
  Formulas: undefined;
  FormulasSubject: { subjectId: string };
  Resources: undefined;
  Timer: undefined;
};

// -----------------------------------------------------------------------------
// Tab: Subjects
// -----------------------------------------------------------------------------
export type SubjectsStackParamList = {
  SubjectsList: undefined;
  SubjectDetail: { subjectId: string; name?: string };
  DocumentEditor: { subjectId: string; documentId: string };
  StudyMapSubject: { subjectId: string; name?: string };
};

// -----------------------------------------------------------------------------
// Tab: Rooms
// -----------------------------------------------------------------------------
export type RoomsStackParamList = {
  RoomsList: undefined;
  RoomDetail: { roomId: string };
};

// -----------------------------------------------------------------------------
// Tab: Profile
// -----------------------------------------------------------------------------
export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
  ThemePicker: undefined;
  PersonalityEditor: undefined;
  MemoryManager: undefined;
  Support: undefined;
  Privacy: undefined;
};

// -----------------------------------------------------------------------------
// Root
// -----------------------------------------------------------------------------
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Login: undefined;
  Onboarding: undefined;
  Modal: undefined;
};

export type TabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Tutor: NavigatorScreenParams<TutorStackParamList>;
  Study: NavigatorScreenParams<StudyStackParamList>;
  Subjects: NavigatorScreenParams<SubjectsStackParamList>;
  Rooms: NavigatorScreenParams<RoomsStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};
