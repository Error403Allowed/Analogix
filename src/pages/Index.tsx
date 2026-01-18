import { useState, useEffect } from "react";
import { LandingHero } from "@/components/LandingHero";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ChatInterface } from "@/components/ChatInterface";
import { Dashboard } from "@/components/Dashboard";
import { 
  getStudentProfile, 
  clearStudentProfile, 
  getLearningStats,
  type StudentProfile,
  type LearningStats 
} from "@/lib/storage";

type AppState = "landing" | "onboarding" | "dashboard" | "chat";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<LearningStats>(getLearningStats());

  useEffect(() => {
    const storedProfile = getStudentProfile();
    if (storedProfile?.onboardingComplete) {
      setProfile(storedProfile);
      setAppState("dashboard");
    }
  }, []);

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
        onEditProfile={handleEditProfile}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  return null;
};

export default Index;