"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import StudyGuideLoadingPage from "@/views/StudyGuideLoadingPage";

export default function Page() {
  return (
    <ProtectedRoute>
      <StudyGuideLoadingPage />
    </ProtectedRoute>
  );
}
