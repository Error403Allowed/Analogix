import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export async function requireUser(request?: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Authentication required");
  }
  return { supabase, user };
}

export function unauthResponse() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

export function rateLimitedResponse(request: Request, maxRequests = 30, windowMs = 5 * 60 * 1000): NextResponse | null {
  const key = rateLimitKey(request);
  return checkRateLimit(key, maxRequests, windowMs);
}

export function rateLimitedAiResponse(request: Request): NextResponse | null {
  const key = rateLimitKey(request, "ai");
  return checkRateLimit(key, 20, 60 * 1000);
}
