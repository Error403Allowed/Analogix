import { test as chatTest, expect } from "./mobile/fixtures/auth-stub";
import type { Route } from "@playwright/test";

/**
 * Regression: writing a prompt that makes the model call write-tools must never
 * loop the AI SDK's approval auto-send into an unbounded request storm or a
 * "Maximum update depth exceeded" render error (previously: 210+ requests in 8s
 * and the render loop reported in useChat.ts:165).
 *
 * The /api/ai/chat endpoint is stubbed with a valid AI SDK UI message stream so
 * the real client approval machinery (auto-approve -> addToolApprovalResponse ->
 * SDK auto-send) runs end-to-end without a live backend.
 */

const sse = (parts: unknown[]) => parts.map((p) => `data: ${JSON.stringify(p)}\n\n`).join("") + "data: [DONE]\n\n";

const simpleText = (body: string) =>
  sse([
    { type: "start" },
    { type: "start-step" },
    { type: "text-start", id: "text-0" },
    ...body.match(/.{1,40}/gs)!.map((delta) => ({ type: "text-delta", id: "text-0", delta })),
    { type: "text-end", id: "text-0" },
    { type: "finish", finishReason: "stop" },
  ]);

const approvalStream = () =>
  sse([
    { type: "start" },
    { type: "start-step" },
    { type: "text-start", id: "t0" },
    { type: "text-delta", id: "t0", delta: "Adding to calendar. " },
    { type: "text-end", id: "t0" },
    { type: "tool-input-start", toolCallId: "call_1", toolName: "create_event" },
    { type: "tool-input-available", toolCallId: "call_1", toolName: "create_event", input: { subjectId: "math", title: "Study", date: "2026-08-21" } },
    { type: "tool-approval-request", toolCallId: "call_1", approvalId: "approval_1", signature: "dummy" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: "Trailing text after request." },
    { type: "text-end", id: "t1" },
    { type: "finish", finishReason: "stop" },
  ]);

/** A continuation that pushes a NEW assistant message requesting ANOTHER approval
 * on every round - the adversarial case that used to auto-send forever. */
const repeatedApprovalContinuation = () =>
  sse([
    { type: "start", messageId: `pushed-${Date.now()}` },
    { type: "start-step" },
    { type: "text-start", id: "c0" },
    { type: "text-delta", id: "c0", delta: "Another one. " },
    { type: "text-end", id: "c0" },
    { type: "tool-input-start", toolCallId: `call-${Date.now()}`, toolName: "create_event" },
    { type: "tool-input-available", toolCallId: `call-${Date.now()}`, toolName: "create_event", input: { subjectId: "math", title: "Study", date: "2026-08-21" } },
    { type: "tool-approval-request", toolCallId: `call-${Date.now()}`, approvalId: `approval-${Date.now()}`, signature: "dummy" },
    { type: "finish", finishReason: "stop" },
  ]);

// Console noise from the auth-stub fixture (fake JWT against the real Supabase
// URL) - not part of what we're testing.
const AUTH_STUB_NOISE = /Failed to load resource: the server responded with a status of 401|JWT cryptographic operation failed|\[theme\]|chatStore/;

function setupHarness(page: import("@playwright/test").Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  let chatCalls = 0;
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" && !AUTH_STUB_NOISE.test(text)) consoleErrors.push(text);
    if (/maximum update depth/i.test(text)) consoleErrors.push(text);
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  return {
    consoleErrors,
    pageErrors,
    get chatCalls() {
      return chatCalls;
    },
    bumpChatCalls: () => {
      chatCalls += 1;
    },
  };
}

chatTest("single write-tool approval auto-approves and completes the turn", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("ai_personality", JSON.stringify({ auto_approve_tools: true }));
  });
  const h = setupHarness(page);
  let call = 0;
  await page.route("**/api/ai/chat", async (route: Route) => {
    call += 1;
    h.bumpChatCalls();
    if (call === 1) {
      await route.fulfill({ status: 200, contentType: "text/event-stream", body: approvalStream() });
    } else {
      await route.fulfill({ status: 200, contentType: "text/event-stream", body: simpleText("Saved to your calendar.") });
    }
  });

  await page.goto("/chat", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const input = page.getByPlaceholder("Ask me anything...");
  await input.fill("Make me a revision timetable for math");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(6000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(h.pageErrors, `page errors: ${JSON.stringify(h.pageErrors)}`).toEqual([]);
  expect(h.consoleErrors, `console errors: ${JSON.stringify(h.consoleErrors)}\npage: ${bodyText.slice(0, 400)}`).toEqual([]);
  expect(h.chatCalls).toBeGreaterThanOrEqual(1);
  expect(h.chatCalls).toBeLessThanOrEqual(3);
  await expect(page.locator("[data-approval]").first()).not.toBeVisible();
});

chatTest("approval auto-send loop is bounded even if the server keeps pushing approvals", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("ai_personality", JSON.stringify({ auto_approve_tools: true }));
  });
  const h = setupHarness(page);
  await page.route("**/api/ai/chat", async (route: Route) => {
    h.bumpChatCalls();
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: h.chatCalls === 1 ? approvalStream() : repeatedApprovalContinuation(),
    });
  });

  await page.goto("/chat", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const input = page.getByPlaceholder("Ask me anything...");
  await input.fill("Make me a revision timetable for math");
  await page.keyboard.press("Enter");
  // Longer wait so an unguarded loop would produce hundreds of requests.
  await page.waitForTimeout(8000);

  expect(h.pageErrors, `page errors: ${JSON.stringify(h.pageErrors)}`).toEqual([]);
  expect(h.consoleErrors, `console errors: ${JSON.stringify(h.consoleErrors)}`).toEqual([]);
  // Round cap is 8; the loop must stop well before the old 200+ storm.
  expect(h.chatCalls, `chat calls: ${h.chatCalls}`).toBeLessThanOrEqual(11);
});

chatTest("manually allowing a write tool sends the approval to the server once", async ({ page }) => {
  // NO auto-approve: the user clicks Allow themselves (the original bug report).
  const h = setupHarness(page);
  const requestBodies: string[] = [];
  let call = 0;
  await page.route("**/api/ai/chat", async (route: Route) => {
    call += 1;
    h.bumpChatCalls();
    requestBodies.push(JSON.stringify(route.request().postDataJSON()));
    if (call === 1) {
      // First call: assistant requests the create_document approval.
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse([
          { type: "start" },
          { type: "start-step" },
          { type: "text-start", id: "t0" },
          { type: "text-delta", id: "t0", delta: "I can create that document. " },
          { type: "text-end", id: "t0" },
          { type: "tool-input-start", toolCallId: "call_1", toolName: "create_document" },
          { type: "tool-input-available", toolCallId: "call_1", toolName: "create_document", input: { subjectId: "math", title: "Math Notes" } },
          { type: "tool-approval-request", toolCallId: "call_1", approvalId: "approval_1", signature: "dummy" },
          { type: "finish", finishReason: "stop" },
        ]),
      });
    } else {
      // The auto-send after Allow must carry the tool part with the approval
      // response; the server then "executes" the tool and finishes.
      await route.fulfill({ status: 200, contentType: "text/event-stream", body: simpleText("Created your document.") });
    }
  });

  await page.goto("/chat", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const input = page.getByPlaceholder("Ask me anything...");
  await input.fill("Create a study document for math");
  await page.keyboard.press("Enter");

  // The approval card appears and the user clicks Allow.
  const allow = page.getByRole("button", { name: "Allow" }).first();
  await expect(allow).toBeVisible({ timeout: 15000 });
  await allow.click();

  // Wait for the auto-send (request 2) to carry the approval and complete.
  await page.waitForTimeout(6000);

  // The critical assertion: request 2's body must still contain the tool part
  // with the approval-responded state (proves sanitizeParts keeps tool parts,
  // which was the "keeps asking forever" root cause).
  const secondBody = requestBodies[1] ?? "";
  expect(secondBody, `second request body: ${secondBody.slice(0, 600)}`).toContain("approval-responded");
  expect(secondBody).toContain("approval_1");
  expect(secondBody).toContain("create_document");

  expect(h.pageErrors, `page errors: ${JSON.stringify(h.pageErrors)}`).toEqual([]);
  expect(h.consoleErrors, `console errors: ${JSON.stringify(h.consoleErrors)}`).toEqual([]);
  // No endless re-ask: exactly 2 requests (prompt + one auto-send).
  expect(h.chatCalls, `chat calls: ${h.chatCalls}`).toBeLessThanOrEqual(3);
  // The card must be gone - nothing to keep asking about.
  await expect(page.locator("[data-approval]").first()).not.toBeVisible();
});

const quizInput = {
  subjectId: "math",
  title: "Math Revision Quiz",
  questions: [
    { question: "What is 2 + 2?", options: ["3", "4", "5"], correctAnswer: 1, explanation: "2 + 2 = 4" },
    { question: "What is the capital of France?", options: ["London", "Paris", "Berlin"], correctAnswer: 1 },
  ],
};

chatTest("a quiz created through the createQuiz tool hands off to /quiz with the correct answer intact", async ({ page }) => {
  // The original bug: the SDK tool returns options as plain strings + a
  // correctAnswer INDEX, but the handoff compared the index to the option
  // *text* (`isCorrect: q.correctAnswer === opt`) so every option was false and
  // index 0 was erased by `q.correctAnswer || ""`.
  await page.addInitScript(() => {
    localStorage.setItem("ai_personality", JSON.stringify({ auto_approve_tools: true }));
  });
  const h = setupHarness(page);
  let call = 0;
  await page.route("**/api/ai/chat", async (route: Route) => {
    call += 1;
    h.bumpChatCalls();
    if (call === 1) {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse([
          { type: "start" },
          { type: "start-step" },
          { type: "text-start", id: "t0" },
          { type: "text-delta", id: "t0", delta: "I can create that quiz. " },
          { type: "text-end", id: "t0" },
          { type: "tool-input-start", toolCallId: "call_1", toolName: "createQuiz" },
          { type: "tool-input-available", toolCallId: "call_1", toolName: "createQuiz", input: quizInput },
          { type: "tool-approval-request", toolCallId: "call_1", approvalId: "approval_1", signature: "dummy" },
          { type: "finish", finishReason: "stop" },
        ]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse([
          { type: "start" },
          { type: "start-step" },
          { type: "tool-output-available", toolCallId: "call_1", toolName: "createQuiz", output: { id: "quiz-1", ...quizInput } },
          { type: "text-start", id: "t1" },
          { type: "text-delta", id: "t1", delta: "Quiz created! Let's start." },
          { type: "text-end", id: "t1" },
          { type: "finish", finishReason: "stop" },
        ]),
      });
    }
  });

  await page.goto("/chat", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const input = page.getByPlaceholder("Ask me anything...");
  await input.fill("Make me a quiz about basic math");
  await page.keyboard.press("Enter");

  // The client hands off to /quiz carrying the questions.
  await expect(page.getByText("What is 2 + 2?").first()).toBeVisible({ timeout: 20000 });

  // The correct option must be flagged: answering "4" scores as correct.
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "Confirm Answer" }).click();
  await expect(page.getByText(/Brilliant work|Great job|Nailed it|Perfect/).first()).toBeVisible({ timeout: 10000 });

  expect(h.pageErrors, `page errors: ${JSON.stringify(h.pageErrors)}`).toEqual([]);
  expect(h.consoleErrors, `console errors: ${JSON.stringify(h.consoleErrors)}`).toEqual([]);
  expect(h.chatCalls, `chat calls: ${h.chatCalls}`).toBeLessThanOrEqual(3);
});