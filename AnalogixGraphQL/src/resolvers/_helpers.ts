import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../context.js";
import { sanitizeError } from "../utils/errorHandler.js";

/** Throws an auth error if the request is unauthenticated. */
export function requireUser(ctx: GraphQLContext): NonNullable<GraphQLContext["user"]> {
  if (!ctx.user || !ctx.supabase) {
    throw new GraphQLError("Authentication required.", {
      extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
    });
  }
  return ctx.user;
}

/** Throws if a feature is not yet implemented. */
export function notImplemented(name: string): never {
  throw new GraphQLError(`Resolver '${name}' is not yet implemented. See BFF README.`, {
    extensions: { code: "NOT_IMPLEMENTED" },
  });
}

/** Throws a GraphQLError with a sanitized (user-safe) message. */
export function throwSanitized(error: unknown, ctx: GraphQLContext, operation?: string): never {
  throw new GraphQLError(sanitizeError(error, { userId: ctx.user?.id ?? "unknown", operation }));
}
