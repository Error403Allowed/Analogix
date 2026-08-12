import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import LoginRedirect from "./LoginRedirect";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}>
        <LoginRedirect />
      </Suspense>
    </div>
  );
}
