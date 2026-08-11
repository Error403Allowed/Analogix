"use client";

import ProtectedRoute from "@/components/layout/ProtectedRoute";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/layout/PageSkeleton";

const SubjectsOverview = dynamic(() => import("@/views/SubjectsOverview"), {
  ssr: false,
  loading: () => <PageLoader message="Loading subjects..." />,
});

export default function SubjectsPage() {
  return (
    <ProtectedRoute>
      <SubjectsOverview />
    </ProtectedRoute>
  );
}
