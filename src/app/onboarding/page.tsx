import { Suspense } from "react";
import Onboarding from "@/views/Onboarding";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <Onboarding />
    </Suspense>
  );
}
