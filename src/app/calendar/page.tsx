"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageSkeleton";

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
