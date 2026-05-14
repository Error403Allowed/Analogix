"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageSkeleton";

const StudyMapSubject = dynamic(() => import("@/views/v2/StudyMapSubject"), {
  ssr: false,
  loading: () => <PageLoader message="Loading subject workspace..." />,
});

export default function StudyMapSubjectPage() {
  return (
    <ProtectedRoute>
      <StudyMapSubject />
    </ProtectedRoute>
  );
}
