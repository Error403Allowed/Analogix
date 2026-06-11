import React from "react";
import { useTheme } from "react-native-paper";
import { NavigationContainer, DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useQuery } from "@apollo/client";
import { useThemeContext } from "../theme/ThemeContext";
import { MaterialTabBar } from "./MaterialTabBar";
import { useAuth } from "../context/AuthContext";
import { ME } from "../graphql/queries/user";
import type { RootStackParamList, TabParamList, HomeStackParamList, TutorStackParamList, StudyStackParamList, SubjectsStackParamList, RoomsStackParamList, ProfileStackParamList } from "./types";

import LoginScreen from "../screens/auth/LoginScreen";
import OnboardingScreen from "../screens/auth/OnboardingScreen";
import TermsScreen from "../screens/auth/TermsScreen";
import PrivacyPolicyScreen from "../screens/auth/PrivacyPolicyScreen";

import DashboardScreen from "../screens/dashboard/DashboardScreen";
import AchievementsScreen from "../screens/dashboard/AchievementsScreen";

import ChatListScreen from "../screens/chat/ChatListScreen";
import ChatSessionScreen from "../screens/chat/ChatSessionScreen";

import StudyHubScreen from "../screens/study/StudyHubScreen";
import FlashcardsScreen from "../screens/study/FlashcardsScreen";
import FlashcardReviewScreen from "../screens/study/FlashcardReviewScreen";
import FlashcardSetScreen from "../screens/study/FlashcardSetScreen";
import QuizScreen from "../screens/study/QuizScreen";
import QuizSessionScreen from "../screens/study/QuizSessionScreen";
import QuizResultsScreen from "../screens/study/QuizResultsScreen";
import CalendarScreen from "../screens/study/CalendarScreen";
import EventDetailScreen from "../screens/study/EventDetailScreen";
import FormulasScreen from "../screens/study/FormulasScreen";
import FormulasSubjectScreen from "../screens/study/FormulasSubjectScreen";
import TimerScreen from "../screens/study/TimerScreen";
import StudyScheduleScreen from "../screens/study/StudyScheduleScreen";
import AssessmentGuideScreen from "../screens/study/AssessmentGuideScreen";

import SubjectsListScreen from "../screens/subjects/SubjectsListScreen";
import SubjectDetailScreen from "../screens/subjects/SubjectDetailScreen";
import DocumentEditorScreen from "../screens/subjects/DocumentEditorScreen";

import RoomsListScreen from "../screens/rooms/RoomsListScreen";
import RoomDetailScreen from "../screens/rooms/RoomDetailScreen";

import ProfileScreen from "../screens/profile/ProfileScreen";
import SettingsScreen from "../screens/profile/SettingsScreen";
import ThemePickerScreen from "../screens/profile/ThemePickerScreen";
import PersonalityEditorScreen from "../screens/profile/PersonalityEditorScreen";
import MemoryManagerScreen from "../screens/profile/MemoryManagerScreen";
import SupportScreen from "../screens/profile/SupportScreen";
import PrivacyScreen from "../screens/profile/PrivacyScreen";
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TutorStack = createNativeStackNavigator<TutorStackParamList>();
const StudyStack = createNativeStackNavigator<StudyStackParamList>();
const SubjectsStack = createNativeStackNavigator<SubjectsStackParamList>();
const RoomsStack = createNativeStackNavigator<RoomsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="Achievements" component={AchievementsScreen} />
    </HomeStack.Navigator>
  );
}
function TutorStackNav() {
  return (
    <TutorStack.Navigator screenOptions={{ headerShown: false }}>
      <TutorStack.Screen name="ChatList" component={ChatListScreen} />
      <TutorStack.Screen name="ChatSession" component={ChatSessionScreen} />
    </TutorStack.Navigator>
  );
}
function StudyStackNav() {
  return (
    <StudyStack.Navigator screenOptions={{ headerShown: false }}>
      <StudyStack.Screen name="StudyHub" component={StudyHubScreen} />
      <StudyStack.Screen name="Flashcards" component={FlashcardsScreen} />
      <StudyStack.Screen name="FlashcardSet" component={FlashcardSetScreen} />
      <StudyStack.Screen name="FlashcardReview" component={FlashcardReviewScreen} />
      <StudyStack.Screen name="Quiz" component={QuizScreen} />
      <StudyStack.Screen name="QuizSession" component={QuizSessionScreen} />
      <StudyStack.Screen name="QuizResults" component={QuizResultsScreen} />
      <StudyStack.Screen name="Calendar" component={CalendarScreen} />
      <StudyStack.Screen name="EventDetail" component={EventDetailScreen} />
      <StudyStack.Screen name="Formulas" component={FormulasScreen} />
      <StudyStack.Screen name="FormulasSubject" component={FormulasSubjectScreen} />
      <StudyStack.Screen name="Timer" component={TimerScreen} />
      <StudyStack.Screen name="StudySchedule" component={StudyScheduleScreen} />
      <StudyStack.Screen name="AssessmentGuide" component={AssessmentGuideScreen} />
    </StudyStack.Navigator>
  );
}
function SubjectsStackNav() {
  return (
    <SubjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <SubjectsStack.Screen name="SubjectsList" component={SubjectsListScreen} />
      <SubjectsStack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
      <SubjectsStack.Screen name="DocumentEditor" component={DocumentEditorScreen} />
    </SubjectsStack.Navigator>
  );
}
function RoomsStackNav() {
  return (
    <RoomsStack.Navigator screenOptions={{ headerShown: false }}>
      <RoomsStack.Screen name="RoomsList" component={RoomsListScreen} />
      <RoomsStack.Screen name="RoomDetail" component={RoomDetailScreen} />
    </RoomsStack.Navigator>
  );
}
function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="ThemePicker" component={ThemePickerScreen} />
      <ProfileStack.Screen name="PersonalityEditor" component={PersonalityEditorScreen} />
      <ProfileStack.Screen name="MemoryManager" component={MemoryManagerScreen} />
      <ProfileStack.Screen name="Support" component={SupportScreen} />
      <ProfileStack.Screen name="Privacy" component={PrivacyScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      tabBar={(p) => <MaterialTabBar {...p} />}
      screenOptions={{ headerShown: false, lazy: false }}
    >
      <Tabs.Screen name="Home" component={HomeStackNav} />
      <Tabs.Screen name="Tutor" component={TutorStackNav} />
      <Tabs.Screen name="Study" component={StudyStackNav} />
      <Tabs.Screen name="Subjects" component={SubjectsStackNav} />
      <Tabs.Screen name="Rooms" component={RoomsStackNav} />
      <Tabs.Screen name="Profile" component={ProfileStackNav} />
    </Tabs.Navigator>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data, loading } = useQuery(ME, { fetchPolicy: "cache-and-network" });
  if (loading) return null;
  if (!data?.me || !data.me.onboardingComplete) return <OnboardingScreen />;
  return <>{children}</>;
}

function TabsWithGate() {
  return (
    <AuthGate>
      <MainTabs />
    </AuthGate>
  );
}

export function RootNavigator() {
  const paperTheme = useTheme();
  const { isDark } = useThemeContext();
  const { user, isReady } = useAuth();

  const navTheme = isDark
    ? {
        ...NavDarkTheme,
        colors: {
          ...NavDarkTheme.colors,
          primary: paperTheme.colors.primary,
          background: paperTheme.colors.background,
          card: paperTheme.colors.surface,
          text: paperTheme.colors.onSurface,
          border: paperTheme.colors.outline,
        },
      }
    : {
        ...NavLightTheme,
        colors: {
          ...NavLightTheme.colors,
          primary: paperTheme.colors.primary,
          background: paperTheme.colors.background,
          card: paperTheme.colors.surface,
          text: paperTheme.colors.onSurface,
          border: paperTheme.colors.outline,
        },
      };

  if (!isReady) return null;

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        {user ? (
          <RootStack.Screen name="Tabs" component={TabsWithGate} />
        ) : (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
            <RootStack.Screen name="Terms" component={TermsScreen} />
            <RootStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
