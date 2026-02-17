import ProtectedRoute from "@/components/ProtectedRoute";
import CalendarPage from "@/views/CalendarPage";

export default function CalendarRoutePage() {
  return (
    <ProtectedRoute>
      <CalendarPage />
    </ProtectedRoute>
  );
}
