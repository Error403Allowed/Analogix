import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes wrapped in <ProtectedRoute> - require an authenticated session.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/chat",
  "/calendar",
  "/study-map",
  "/study",
  "/profile",
  "/subjects",
  "/achievements",
];

// Pages intentionally served without authentication.
const PUBLIC_PREFIXES = [
  "/flashcards",
  "/formulas",
  "/quiz",
  "/resources",
  "/rooms",
];

function isPathUnder(prefixes: string[], pathname: string): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: "sb-auth-token",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          const secureCookies = process.env.NODE_ENV === "production";
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, sameSite: "lax", secure: secureCookies })
          );
        },
      },
    }
  );

  // Presence check from the session cookie (no network), then attempt a token
  // refresh so the cookie stays valid for downstream SSR clients.
  const { data: { session } } = await supabase.auth.getSession();
  await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Server-side gate: unauthenticated visitors to app routes are sent to
  // /login before the page ever hydrates. Onboarding of brand-new accounts is
  // handled client-side (ProtectedRoute) because it needs a DB profile lookup.
  const isProtected = isPathUnder(PROTECTED_PREFIXES, pathname);
  const isPublic = isPathUnder(PUBLIC_PREFIXES, pathname);
  if (isProtected && !isPublic && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};