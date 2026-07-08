import { NextResponse } from "next/server";
import { callGroqChat, formatError } from "../_utils";
import { requireUser, unauthResponse } from "@/lib/api-auth";
export const runtime = "nodejs";
export async function POST(request) {
    try {
        await requireUser();
        const body = await request.json();
        const conversation = body.conversation || "";
        const latestMessage = body.latestMessage || "";
        const systemPrompt = `You are naming a study chat session. Write a short 3-6 word title capturing the SPECIFIC topic being studied. Be concrete — not "Math Help" but "Quadratic Formula Confusion", "WW2 Causes Breakdown", "Python List Indexing". No quotes, no punctuation, just the title.`;
        const content = await callGroqChat({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Conversation:\n${conversation}\n\nLatest: ${latestMessage}\n\nTitle:` },
            ],
            max_tokens: 30,
            temperature: 0.5,
        }, "lightweight");
        let title = content.trim();
        title = title.replace(/^["'`]|["'`]$/g, "").trim();
        title = title.replace(/^(Title:|Here'?s?( a title)?:|The title is:?)/i, "").trim();
        title = title.replace(/[.!?]$/, "").trim();
        title = title.replace(/^<think>[\s\S]*?<\/think>\s*/i, "").trim();
        title = title.replace(/^<think>[\s\S]*$/i, "").trim();
        title = title.slice(0, 50);
        if (!title || title.length < 2) {
            const words = latestMessage.trim().split(/\s+/).slice(0, 4).join(" ");
            title = words || "New chat";
        }
        return NextResponse.json({ title });
    }
    catch (error) {
        const message = formatError(error);
        console.error("[/api/groq/title] Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map