import { useState, useEffect } from "react";
import { LandingHero } from "@/components/LandingHero";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ChatInterface } from "@/components/ChatInterface";
import { Dashboard } from "@/components/Dashboard";
import { 
  getStudentProfile, 
  clearStudentProfile, 
  getLearningStats,
  getSavedAppState,
  saveAppState,
  type StudentProfile,
  type LearningStats 
} from "@/lib/storage";
import { useTheme } from "@/hooks/use-theme";

type AppState = "landing" | "onboarding" | "dashboard" | "chat";

const Index = () => {
  const { theme } = useTheme();
  const [appState, setAppState] = useState<AppState>("landing");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<LearningStats>(getLearningStats());

  useEffect(() => {
    const storedProfile = getStudentProfile();
    const savedState = getSavedAppState<AppState>("landing");

    if (storedProfile?.onboardingComplete) {
      setProfile(storedProfile);
      // Only restore dashboard or chat if we have a profile
      if (savedState === "chat") {
        setAppState("chat");
      } else {
        setAppState("dashboard");
      }
    } else {
      // If no profile, we must be in onboarding or landing
      setAppState(savedState === "onboarding" ? "onboarding" : "landing");
    }
  }, []);

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  const refreshStats = () => {
    setStats(getLearningStats());
  };

  const handleGetStarted = () => {
    setAppState("onboarding");
  };

  const handleOnboardingComplete = (newProfile: StudentProfile) => {
    setProfile(newProfile);
    setAppState("dashboard");
  };

  const handleEditProfile = () => {
    clearStudentProfile();
    setProfile(null);
    setAppState("onboarding");
  };

  const handleStartChat = () => {
    setAppState("chat");
  };

  const handleBackToDashboard = () => {
    refreshStats();
    setAppState("dashboard");
  };

  if (appState === "landing") {
    return <LandingHero onGetStarted={handleGetStarted} />;
  }

  if (appState === "onboarding") {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (appState === "dashboard" && profile) {
    return (
      <Dashboard 
        profile={profile} 
        stats={stats}
        onStartChat={handleStartChat} 
        onEditProfile={handleEditProfile} 
      />
    );
  }

  if (appState === "chat" && profile) {
    return (
      <ChatInterface 
        profile={profile} 
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  return null;
};

export default Index;