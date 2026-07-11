import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyAccessToken, type AuthenticatedUser } from "./auth/verifyToken.js";
import { getUserClient } from "./supabase.js";
import type { PubSubChannels } from "./pubsub.js";

export interface GraphQLContext {
  /** The authenticated user, or null for unauthenticated requests. */
  user: AuthenticatedUser | null;
  /** Supabase client scoped to the user's access token (RLS applies). Null if unauthenticated. */
  supabase: SupabaseClient | null;
  /** PubSub for subscriptions (chatStream, room presence, etc.). */
  pubsub: import("graphql-subscriptions").PubSub;
  /** Request ID for log correlation. */
  requestId: string;
}

/**
 * Builds the per-request GraphQL context. Called once per HTTP request
 * and once per WebSocket connection.
 */
export async function buildContext({
  token,
  pubsub,
  requestId,
}: {
  token: string | null;
  pubsub: import("graphql-subscriptions").PubSub;
  requestId: string;
}): Promise<GraphQLContext> {
  const user = await verifyAccessToken(token);
  const supabase = user ? getUserClient(token!) : null;

  return {
    user,
    supabase,
    pubsub,
    requestId,
  };
}
