"use client";

import ProtectedRoute from "@/components/layout/ProtectedRoute";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/layout/PageSkeleton";

const SubjectCurriculum = dynamic(() => import("@/views/SubjectCurriculum"), {
  ssr: false,
  loading: () => <PageLoader message="Loading curriculum..." />,
});

export default function SubjectCurriculumPage() {
  return (
    <ProtectedRoute>
      <SubjectCurriculum />
    </ProtectedRoute>
  );
}
