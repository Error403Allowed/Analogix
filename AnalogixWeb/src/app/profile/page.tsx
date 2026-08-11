"use client";

import ProtectedRoute from "@/components/layout/ProtectedRoute";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/layout/PageSkeleton";

const ProfilePage = dynamic(() => import("@/views/ProfilePage"), {
  ssr: false,
  loading: () => <PageLoader message="Loading profile..." />,
});

export default function ProfileRoute() {
  return (
    <ProtectedRoute>
      <div className="px-4 py-8 md:px-8 md:py-10">
        <ProfilePage />
      </div>
    </ProtectedRoute>
  );
}
