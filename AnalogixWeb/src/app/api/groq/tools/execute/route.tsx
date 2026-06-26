import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeTools } from "@/lib/mcp-executor";
import type { ToolCall, ToolExecutionResult } from "@analogix/shared/types";

export const runtime = "nodejs";

const MAX_TOOLS_PER_REQUEST = 10;
const MAX_ARG_SIZE_BYTES = 100_000;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult?.data?.session?.access_token;
    if (!accessToken) {
      return NextResponse.json({ error: "No session token" }, { status: 401 });
    }

    const body = await request.json();
    const { tools: rawTools } = body as { tools: ToolCall[] };

    if (!rawTools || !Array.isArray(rawTools) || rawTools.length === 0) {
      return NextResponse.json({ error: "No tools provided" }, { status: 400 });
    }
    if (rawTools.length > MAX_TOOLS_PER_REQUEST) {
      return NextResponse.json({ error: `Too many tools (max ${MAX_TOOLS_PER_REQUEST})` }, { status: 400 });
    }
    if (JSON.stringify(rawTools).length > MAX_ARG_SIZE_BYTES) {
      return NextResponse.json({ error: "Tool arguments too large" }, { status: 400 });
    }

    const result: ToolExecutionResult = await executeTools(rawTools, user.id, accessToken);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/groq/tools/execute] Error:", error);
    return NextResponse.json(
      {
        results: [{
          toolName: "execute",
          success: false,
          error: "Internal server error",
        }],
      },
      { status: 500 }
    );
  }
}
