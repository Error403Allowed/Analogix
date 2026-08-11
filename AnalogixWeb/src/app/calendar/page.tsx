"use client";

import ProtectedRoute from "@/components/layout/ProtectedRoute";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/layout/PageSkeleton";

const CalendarPage = dynamic(() => import("@/views/CalendarPage"), {
  ssr: false,
  loading: () => <PageLoader message="Loading calendar..." />,
});

export default function CalendarRoutePage() {
  return (
    <ProtectedRoute>
      <CalendarPage />
    </ProtectedRoute>
  );
}
