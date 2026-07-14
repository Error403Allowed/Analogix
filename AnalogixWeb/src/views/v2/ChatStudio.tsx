"use client";

import { useMemo, useState } from "react";
import { ArrowUp, BookOpen, ClipboardList, Layers, Loader2 } from "lucide-react";
import { WorkspaceScaffold, Panel } from "@/components/v2/WorkspaceScaffold";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getGroqCompletion } from "@/services/groq";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useRouter } from "next/navigation";
import type { ChatMessage } from "@/types/chat";

type StudioMessage = {
  role: "user" | "assistant";
  content: string;
};

const assistantPrompt =
  "Respond as a high-clarity study tutor. Structure answers with: Key takeaway, Explanation, Worked example, Next action.";

export default function ChatStudio() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<StudioMessage[]>([
    {
      role: "assistant",
      content:
        "## Key takeaway\nWelcome to AI Tutor.\n\n## Explanation\nAsk a topic and I will break it down clearly.\n\n## Worked example\nTry: *Explain acceleration vs velocity*.\n\n## Next action\nPick a study intent and send your question.",
    },
  ]);

  const canSend = input.trim().length > 0 && !loading;

  const history = useMemo(
    () =>
      messages.map((m) => ({
        role: m.role,
        content: m.content,
      })) as ChatMessage[],
    [messages],
  );

  const send = async () => {
    if (!canSend) return;
    const content = input.trim();
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const response = await getGroqCompletion(
        [
          { role: "system", content: assistantPrompt } as ChatMessage,
          ...history,
          { role: "user", content } as ChatMessage,
        ],
        { responseLength: 0.75 },
      );
      setMessages((prev) => [...prev, { role: "assistant", content: response.content }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkspaceScaffold
      title="AI Tutor"
      subtitle="A focused, three-zone tutoring workflow with structured responses and direct study actions."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => router.push("/quiz")}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Build Quiz
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/flashcards")}>
            <Layers className="mr-2 h-4 w-4" />
            Generate Cards
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/resources")}>
            <BookOpen className="mr-2 h-4 w-4" />
            Open Resources
          </Button>
        </>
      }
      rail={
        <>
          <Panel title="Study Intents">
            <div className="grid gap-2">
              {["Explain concept", "Test me", "Summarize notes", "Create revision plan"].map((intent) => (
                <button
                  key={intent}
                  onClick={() => setInput((prev) => (prev ? `${prev}\n${intent}: ` : `${intent}: `))}
                  className="rounded-xl border border-border/70 bg-background px-3 py-2 text-left text-sm hover:border-primary/50"
                >
                  {intent}
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="Conversation Structure" description="Every response should be scan-friendly.">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Key takeaway</li>
              <li>Explanation</li>
              <li>Worked example</li>
              <li>Next action</li>
            </ul>
          </Panel>
        </>
      }
    >
      <Panel className="min-h-[68vh]">
        <div className="flex max-h-[58vh] flex-col gap-4 overflow-y-auto pr-1">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={message.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[90%]"}
            >
              <div
                className={
                  message.role === "user"
                    ? "rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground"
                    : "rounded-lg border border-border/60 bg-background px-4 py-3 text-sm"
                }
              >
                {message.role === "assistant" ? (
                  <MarkdownRenderer content={message.content} className="text-sm leading-relaxed" />
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
          {loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking…
            </div>
          ) : null}
        </div>

        <div className="mt-5 border-t border-border/70 pt-4">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a focused study question…"
            className="min-h-[96px] resize-none rounded-lg border-border/70"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={send} disabled={!canSend} className="rounded-xl">
              <ArrowUp className="mr-2 h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </Panel>
    </WorkspaceScaffold>
  );
}
