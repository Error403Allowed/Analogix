import { z } from "zod";
import { randomUUID } from "crypto";
import { GraphQLError } from "graphql";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolCall, ToolResult, ToolExecutionResult } from "@analogix/shared/types";
import type { GraphQLContext } from "../../context.js";

export type ToolHandler = (
  args: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient,
) => Promise<unknown>;

export { z, randomUUID, GraphQLError };
export type { SupabaseClient, ToolCall, ToolResult, ToolExecutionResult, GraphQLContext };
