"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import SubjectDocument from "@/views/SubjectDocument";

export default function SubjectDocumentDetailPage() {
  return (
    <ProtectedRoute>
      <SubjectDocument />
    </ProtectedRoute>
  );
}
