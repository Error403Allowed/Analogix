"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeAuthCodeExchange, redirectWithError } from "@/lib/auth-callback";
import { Loader2 } from "lucide-react";

export default function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const origin = window.location.origin;
    const hash = window.location.hash;

    // Check URL hash for error params (Supabase PKCE errors arrive in hash)
    if (hash) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const hashError = hashParams.get("error");
      const hashErrorCode = hashParams.get("error_code");
      const hashErrorDesc = hashParams.get("error_description");
      if (hashError || hashErrorCode) {
        console.error("Auth callback: hash error", { hashError, hashErrorCode, hashErrorDesc });
        window.location.hash = "";
        router.replace(redirectWithError(origin, hashErrorCode ?? hashError ?? "unknown", hashErrorDesc));
        return;
      }
    }

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorParam) {
      console.error("OAuth error:", errorParam, errorDescription);
      router.replace(redirectWithError(origin, errorParam, errorDescription));
      return;
    }

    if (!code) {
      console.error("Auth callback: no code in URL");
      router.replace(redirectWithError(origin, "missing_code", null));
      return;
    }

    void completeAuthCodeExchange(code).then((target) => router.replace(target));
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
