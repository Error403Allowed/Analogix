"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageSkeleton";

const AchievementsLibrary = dynamic(() => import("@/views/AchievementsLibrary"), {
  ssr: false,
  loading: () => <PageLoader message="Loading achievements..." />,
});

export default function AchievementsPage() {
  return (
    <ProtectedRoute>
      <div className="pt-8 md:pt-10">
        <AchievementsLibrary />
      </div>
    </ProtectedRoute>
  );
}
