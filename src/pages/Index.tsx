import { useState, useEffect } from "react";
import { LandingHero } from "@/components/LandingHero";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ChatInterface } from "@/components/ChatInterface";
import { getStudentProfile, clearStudentProfile, type StudentProfile } from "@/lib/storage";

type AppState = "landing" | "onboarding" | "chat";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    const storedProfile = getStudentProfile();
    if (storedProfile?.onboardingComplete) {
      setProfile(storedProfile);
      setAppState("chat");
    }
  }, []);

  const handleGetStarted = () => {
    setAppState("onboarding");
  };

  const handleOnboardingComplete = (newProfile: StudentProfile) => {
    setProfile(newProfile);
    setAppState("chat");
  };

  const handleEditProfile = () => {
    clearStudentProfile();
    setProfile(null);
    setAppState("onboarding");
  };

  if (appState === "landing") {
    return <LandingHero onGetStarted={handleGetStarted} />;
  }

  if (appState === "onboarding") {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (appState === "chat" && profile) {
    return <ChatInterface profile={profile} onEditProfile={handleEditProfile} />;
  }

  return null;
};

export default Index;
