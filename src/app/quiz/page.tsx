// Quiz has been merged into the Flashcards page.
// Redirect /quiz → /flashcards?tab=quiz
import { redirect } from "next/navigation";

export default function QuizPage() {
  redirect("/flashcards?tab=quiz");
}
