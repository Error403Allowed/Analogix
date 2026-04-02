/**
 * POST /api/groq/realtime-token
 *
 * Verifies the user session, then mints a short-lived JWT that the
 * WebSocket realtime server will accept.  The browser never touches
 * the JWT secret — it only receives the signed token.
 *
 * Body:  { docId: string }
 * Returns: { token: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.REALTIME_JWT_SECRET ?? "analogix-realtime-dev-secret-change-in-prod",
);

export async function POST(req: NextRequest) {
  try {
    const { docId } = (await req.json()) as { docId?: string };
    if (!docId) {
      return NextResponse.json({ error: "docId required" }, { status: 400 });
    }

    // Verify Supabase session server-side.
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Mint JWT — expires in 60 seconds (the WS server checks this on connect).
    const token = await new SignJWT({
      sub: user.id,
      docId,
      name: user.user_metadata?.full_name ?? user.email ?? "Student",
      // Pick a stable colour from the user id so the same person always
      // gets the same cursor colour across sessions.
      color: pickColor(user.id),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("60s")
      .sign(JWT_SECRET);

    return NextResponse.json({ token });
  } catch (err) {
    console.error("[realtime-token]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

const COLORS = ["#0f766e", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#059669"];

function pickColor(userId: string): string {
  const hash = userId
    .split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return COLORS[hash % COLORS.length];
}
