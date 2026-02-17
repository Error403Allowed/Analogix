import ProtectedRoute from "@/components/ProtectedRoute";
import AchievementsLibrary from "@/views/AchievementsLibrary";

export default function AchievementsPage() {
  return (
    <ProtectedRoute>
      <AchievementsLibrary />
    </ProtectedRoute>
  );
}
