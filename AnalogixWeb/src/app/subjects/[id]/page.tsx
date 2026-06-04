"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageSkeleton";

const SubjectDetail = dynamic(() => import("@/views/SubjectDetail"), {
  ssr: false,
  loading: () => <PageLoader message="Loading subject..." />,
});

export default function SubjectPage() {
  return (
    <ProtectedRoute>
      <SubjectDetail />
    </ProtectedRoute>
  );
}
