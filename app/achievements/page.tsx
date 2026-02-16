import ProtectedRoute from "@/components/ProtectedRoute";
import AchievementsLibrary from "@/pages/AchievementsLibrary";

export default function AchievementsPage() {
  return (
    <ProtectedRoute>
      <AchievementsLibrary />
    </ProtectedRoute>
  );
}
