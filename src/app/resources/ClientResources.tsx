"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ResourcesPage = dynamic(() => import("@/views/ResourcesPage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
});

export default function ClientResources() {
  return <ResourcesPage />;
}
