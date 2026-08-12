import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import CallbackHandler from "./CallbackHandler";

export default function CallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
