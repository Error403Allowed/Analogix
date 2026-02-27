"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import with ssr:false so localStorage/client-only code
// never runs during server rendering — kills the hydration mismatch (React #418).
const FormulasPage = dynamic(() => import("@/views/FormulasPage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
});

export default function ClientFormulas() {
  return <FormulasPage />;
}
