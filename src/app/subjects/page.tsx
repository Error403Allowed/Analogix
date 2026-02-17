"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import SubjectsOverview from "@/views/SubjectsOverview";

export default function SubjectsPage() {
  return (
    <ProtectedRoute>
      <SubjectsOverview />
    </ProtectedRoute>
  );
}
