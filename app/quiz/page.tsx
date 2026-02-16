import ProtectedRoute from "@/components/ProtectedRoute";
import Quiz from "@/pages/Quiz";

export default function QuizPage() {
  return (
    <ProtectedRoute>
      <Quiz />
    </ProtectedRoute>
  );
}
