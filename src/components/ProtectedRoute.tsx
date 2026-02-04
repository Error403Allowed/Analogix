import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const hasCompletedOnboarding = userPrefs?.onboardingComplete;

  if (!hasCompletedOnboarding) {
    // Redirect to landing or onboarding if they haven't set up their profile
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
