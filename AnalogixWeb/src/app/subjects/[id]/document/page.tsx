"use client";

import ProtectedRoute from "@/components/layout/ProtectedRoute";
import SubjectDocumentIndex from "@/views/SubjectDocumentIndex";

export default function SubjectDocumentPage() {
  return (
    <ProtectedRoute>
      <SubjectDocumentIndex />
    </ProtectedRoute>
  );
}
