"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const qs = error ? `?error=${encodeURIComponent(error)}` : "";
    router.replace(`/onboarding${qs}`);
  }, [router, searchParams]);

  return (
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  );
}
