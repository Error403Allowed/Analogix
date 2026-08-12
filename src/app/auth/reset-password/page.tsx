import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
