import path from "path";
import fs from "fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ToolCall, ToolResult, ToolExecutionResult } from "@analogix/shared/types";

const IS_DEV = process.env.NODE_ENV !== "production";

function findMcpDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "packages/analogix-mcp"),
    path.resolve(process.cwd(), "../packages/analogix-mcp"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[1];
}

const MCP_PACKAGE_DIR = findMcpDir();
const MCP_SRC = path.join(MCP_PACKAGE_DIR, "src/index.ts");
const MCP_DIST = path.join(MCP_PACKAGE_DIR, "dist/index.js");
const MCP_SCRIPT_PATH = process.env.MCP_SERVER_PATH || (IS_DEV ? MCP_SRC : MCP_DIST);

function findRunner(): string | null {
  if (!IS_DEV) return null;
  const paths = [
    path.resolve(process.cwd(), "node_modules/.bin/tsx"),
    path.resolve(process.cwd(), "../node_modules/.bin/tsx"),
    path.resolve(process.cwd(), "../../node_modules/.bin/tsx"),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const TSX_PATH = findRunner();
const command = process.env.MCP_RUNNER || (IS_DEV && TSX_PATH ? TSX_PATH : "node");
const args = [MCP_SCRIPT_PATH];

let client: Client | null = null;
let transport: StdioClientTransport | null = null;

function buildEnv() {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    NODE_ENV: process.env.NODE_ENV || "development",
    PATH: process.env.PATH || "",
  };
}

async function ensureConnected(): Promise<Client> {
  if (client) return client;

  const env = buildEnv();
  if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL not set — MCP server cannot start");
  if (!env.SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY not set — MCP server cannot start");

  const mcpArgs = [...args];

  transport = new StdioClientTransport({
    command,
    args: mcpArgs,
    env,
    stderr: "pipe",
  });

  client = new Client(
    { name: "analogix-executor", version: "1.0.0" },
    { capabilities: {} },
  );

  await client.connect(transport);

  return client;
}

export async function executeTools(
  tools: ToolCall[],
  userId: string,
  accessToken?: string,
): Promise<ToolExecutionResult> {
  let c: Client;
  try {
    c = await ensureConnected();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to MCP server";
    return {
      results: tools.map(t => ({
        toolName: t.name,
        success: false,
        error: msg,
      })),
    };
  }

  const results: ToolResult[] = [];

  for (const tool of tools) {
    try {
      const args = { ...tool.args, _userId: userId };
      const mcpResult = await c.callTool({ name: tool.name, arguments: args });
      const isError = (mcpResult as any)?.isError === true;
      const rawText = (mcpResult as any)?.content?.[0]?.text ?? JSON.stringify(mcpResult);

      results.push({
        toolName: tool.name,
        success: !isError,
        data: isError ? undefined : tryParseJson(rawText),
        error: isError ? sanitizeMcpError(rawText) : undefined,
      });
    } catch (err) {
      results.push({
        toolName: tool.name,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { results };
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Sanitize MCP error messages to prevent schema/implementation details from leaking to the client. */
function sanitizeMcpError(message: string): string {
  // Keep Zod validation errors (actionable, safe)
  if (message.includes("Required") || message.includes("Expected") || message.includes("Invalid")) {
    return message;
  }
  // Log the actual error server-side for debugging
  console.error("[mcp-executor] Tool error:", message);
  // Suppress database-level errors that could leak schema
  if (
    message.includes("violates") ||
    message.includes("constraint") ||
    message.includes("null value") ||
    message.includes("not-null") ||
    message.includes("permission denied for table") ||
    message.includes("syntax error")
  ) {
    return "Database operation failed";
  }
  return message;
}

export async function shutdownMcpServer() {
  try {
    await client?.close();
  } catch { /* ignore close errors */ }
  client = null;
  transport = null;
}

// Clean up child process on server shutdown
process.on("SIGTERM", () => { shutdownMcpServer(); });
process.on("SIGINT", () => { shutdownMcpServer(); process.exit(0); });
