"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import SubjectDetail from "@/views/SubjectDetail";

export default function SubjectPage() {
  return (
    <ProtectedRoute>
      <SubjectDetail />
    </ProtectedRoute>
  );
}
