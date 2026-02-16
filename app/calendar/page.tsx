import ProtectedRoute from "@/components/ProtectedRoute";
import CalendarPage from "@/pages/CalendarPage";

export default function CalendarRoutePage() {
  return (
    <ProtectedRoute>
      <CalendarPage />
    </ProtectedRoute>
  );
}
