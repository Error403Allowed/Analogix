"use client";

import ProtectedRoute from "@/components/layout/ProtectedRoute";
import dynamic from "next/dynamic";
import { DocumentSkeleton } from "@/components/layout/PageSkeleton";

const SubjectDocument = dynamic(() => import("@/views/SubjectDocument"), {
  ssr: false,
  loading: () => <DocumentSkeleton />,
});

export default function SubjectDocumentDetailPage() {
  return (
    <ProtectedRoute>
      <SubjectDocument />
    </ProtectedRoute>
  );
}
