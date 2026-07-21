import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../env.js";
import { logger } from "../logger.js";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Returns a JWKS instance for the project's Supabase auth.
 * Lazy-init so tests / dev without network still boot.
 */
function getJwks() {
  if (jwks) return jwks;
  try {
    // The JWKS URL is `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
    jwks = createRemoteJWKSet(new URL(`${env.supabase.url}/auth/v1/.well-known/jwks.json`));
  } catch (err) {
    logger.warn({ err }, "[auth] Could not initialize Supabase JWKS — verification will reject all tokens");
    jwks = null;
  }
  return jwks;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  role: string | null;
  appMetadata: Record<string, unknown>;
  userMetadata: Record<string, unknown>;
}

/**
 * Verifies a Supabase access token (JWT) using the project's JWKS.
 * Returns the authenticated user (id, email, role, metadata) or null
 * if the token is missing/invalid.
 *
 * Used by both HTTP and WS contexts — call with the raw bearer token.
 */
export async function verifyAccessToken(token: string | null | undefined): Promise<AuthenticatedUser | null> {
  if (!token) return null;

  const jwksInstance = getJwks();
  if (!jwksInstance) return null;

  try {
    const { payload } = await jwtVerify(token, jwksInstance, {
      issuer: `${env.supabase.url}/auth/v1`,
      audience: "authenticated",
    });
    return mapPayloadToUser(payload);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "[auth] JWT verification failed");
    return null;
  }
}

function mapPayloadToUser(payload: JWTPayload): AuthenticatedUser {
  return {
    id: String(payload.sub ?? ""),
    email: (payload.email as string | undefined) ?? null,
    role: (payload.role as string | undefined) ?? "authenticated",
    appMetadata: (payload.app_metadata as Record<string, unknown> | undefined) ?? {},
    userMetadata: (payload.user_metadata as Record<string, unknown> | undefined) ?? {},
  };
}

/**
 * Pulls a bearer token out of an HTTP request from the `Authorization` header.
 * Returns null if not found.
 */
export function extractBearerToken(req: { headers: { authorization?: string | undefined } }): string | null {
  const header = req.headers.authorization ?? "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return null;
}
