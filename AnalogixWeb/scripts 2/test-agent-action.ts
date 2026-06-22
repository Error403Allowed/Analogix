import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { handleAddFlashcards } from "../src/app/api/groq/agent-action/route";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase config in environment (.env must set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const run = async () => {
  console.log("[test-agent-action] Starting integration test...");

  const email = `test-agent-action+${Date.now()}@example.com`;
  const password = "Test1234!";

  console.log("[test-agent-action] Creating test user", email);
  const createResult = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createResult.error || !createResult.data.user) {
    throw new Error(`Failed to create test user: ${createResult.error?.message || "no user returned"}`);
  }

  const userId = createResult.data.user.id;
  console.log("[test-agent-action] Test user created with id", userId);

  const action = {
    type: "add_flashcards",
    subjectId: "math",
    setName: "Integration Test Set",
    cards: [
      { front: "What is 2+2?", back: "4" },
      { front: "What is the square root of 9?", back: "3" },
    ],
  };

  const result = await handleAddFlashcards(supabase, userId, action, "math", new Set(["math", "physics", "chemistry", "biology", "english"]));
  console.log("[test-agent-action] handleAddFlashcards result:", result);

  if (result.status !== "success") {
    throw new Error(`Flashcard creation did not succeed: ${JSON.stringify(result)}`);
  }

  const verifySet = await supabase.from("flashcard_sets").select("id, user_id, subject_id, name").eq("id", result.setId).single();
  if (verifySet.error) {
    throw new Error(`Failed to verify flashcard set: ${verifySet.error.message}`);
  }

  const verifyCards = await supabase.from("flashcards").select("id, user_id, subject_id, set_id, front, back").eq("set_id", result.setId);
  if (verifyCards.error) {
    throw new Error(`Failed to verify inserted cards: ${verifyCards.error.message}`);
  }

  console.log("[test-agent-action] Verified flashcard set:", verifySet.data);
  console.log("[test-agent-action] Verified flashcards:", verifyCards.data);
  if (!verifyCards.data || verifyCards.data.length !== 2) {
    throw new Error(`Expected 2 inserted cards, got ${verifyCards.data?.length}`);
  }

  console.log("[test-agent-action] Cleaning up test data...");
  const cleanupCards = await supabase.from("flashcards").delete().eq("set_id", result.setId);
  if (cleanupCards.error) {
    console.warn("[test-agent-action] Warning: could not cleanup flashcards", cleanupCards.error.message);
  }
  const cleanupSet = await supabase.from("flashcard_sets").delete().eq("id", result.setId);
  if (cleanupSet.error) {
    console.warn("[test-agent-action] Warning: could not cleanup set", cleanupSet.error.message);
  }

  const deleteUser = await supabase.auth.admin.deleteUser(userId);
  if (deleteUser.error) {
    console.warn("[test-agent-action] Warning: could not delete test user", deleteUser.error.message);
  }

  console.log("[test-agent-action] Integration test completed successfully.");
};

run().catch((error) => {
  console.error("[test-agent-action] FAILED:", error);
  process.exit(1);
});
