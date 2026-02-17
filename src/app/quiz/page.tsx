import ProtectedRoute from "@/components/ProtectedRoute";
import Quiz from "@/views/Quiz";

export default function QuizPage() {
  return (
    <ProtectedRoute>
      <Quiz />
    </ProtectedRoute>
  );
}
