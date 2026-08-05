"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageSkeleton";

const StudyHub = dynamic(() => import("@/views/StudyHub"), {
  ssr: false,
  loading: () => <PageLoader message="Loading study hub..." />,
});

export default function StudyPage() {
  return (
    <ProtectedRoute>
      <div className="px-4 py-8 md:px-8 md:py-10">
        <StudyHub />
      </div>
    </ProtectedRoute>
  );
}
