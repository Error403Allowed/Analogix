"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageSkeleton";

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
