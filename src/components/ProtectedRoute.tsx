"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const router = useRouter();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    const completed = Boolean(userPrefs?.onboardingComplete);
    setHasCompletedOnboarding(completed);
    if (!completed) {
      router.replace("/");
    }
  }, [router]);

  if (!hasCompletedOnboarding) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
