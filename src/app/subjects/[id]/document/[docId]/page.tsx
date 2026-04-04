"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import dynamic from "next/dynamic";
import { DocumentSkeleton } from "@/components/PageSkeleton";

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
