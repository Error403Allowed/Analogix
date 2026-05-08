"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/onboarding?step=2";

  useEffect(() => {
    const exchangeCode = async () => {
      if (code) {
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!error) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("onboarding_complete, name, grade, state, subjects, hobbies, hobby_ids, hobby_details")
              .eq("id", user.id)
              .maybeSingle();

            const hasProfileData = profile?.onboarding_complete 
              || profile?.name 
              || profile?.grade 
              || profile?.state 
              || (Array.isArray(profile?.subjects) && profile.subjects.length > 0)
              || (Array.isArray(profile?.hobbies) && profile.hobbies.length > 0)
              || (Array.isArray(profile?.hobby_ids) && profile.hobby_ids.length > 0)
              || (profile?.hobby_details && Object.keys(profile.hobby_details).length > 0);

            if (hasProfileData) {
              router.replace("/dashboard");
              return;
            }
          }
          router.replace(next);
          return;
        }
        console.error("Exchange error:", error);
      }

      if (errorParam) {
        console.error("OAuth error:", errorParam, errorDescription);
      }
      
      router.replace(`/onboarding?error=auth_failed`);
    };

    exchangeCode();
  }, [code, errorParam, errorDescription, next, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";