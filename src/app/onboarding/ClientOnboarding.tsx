"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ssr:false prevents the Onboarding view from running on the server
const Onboarding = dynamic(() => import("@/views/Onboarding"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
});

export default function ClientOnboarding() {
  return <Onboarding />;
}
