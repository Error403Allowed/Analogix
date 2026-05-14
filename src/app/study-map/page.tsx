"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageSkeleton";

const StudyMapHome = dynamic(() => import("@/views/v2/StudyMapHome"), {
  ssr: false,
  loading: () => <PageLoader message="Loading study map..." />,
});

export default function StudyMapPage() {
  return (
    <ProtectedRoute>
      <StudyMapHome />
    </ProtectedRoute>
  );
}
