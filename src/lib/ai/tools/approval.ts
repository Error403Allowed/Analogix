import { createHmac } from "crypto";

// ============================================================================
// TOOL APPROVAL SECRET
// ----------------------------------------------------------------------------
// Write tools require the student's explicit Allow/Deny before execution. The
// AI SDK signs each approval request (HMAC-SHA256) when a tool-approval secret
// is configured, so a client cannot fabricate an approval for a tool call the
// model never made. The secret must be stable across serverless invocations,
// so it comes from the environment rather than process memory.
// ============================================================================

let cachedSecret: string | null = null;

export const getToolApprovalSecret = (): string => {
  if (cachedSecret) return cachedSecret;
  const envSecret = process.env.AI_TOOL_APPROVAL_SECRET;
  if (envSecret) {
    cachedSecret = envSecret;
    return envSecret;
  }
  // Derive a stable secret from an existing server-side secret so behaviour is
  // deterministic in deployed/serverless environments too.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    cachedSecret = createHmac("sha256", serviceRoleKey)
      .update("analogix-tool-approval")
      .digest("hex");
    return cachedSecret;
  }
  // Local-only fallback. Logged so developers know approvals are not signed.
  console.warn(
    "[AI] AI_TOOL_APPROVAL_SECRET not set - using in-memory fallback. Set it in production.",
  );
  cachedSecret = "analogix-local-tool-approval-fallback";
  return cachedSecret;
};