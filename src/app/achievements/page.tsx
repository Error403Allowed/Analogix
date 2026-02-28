import ProtectedRoute from "@/components/ProtectedRoute";
import AchievementsLibrary from "@/views/AchievementsLibrary";

export default function AchievementsPage() {
  return (
    <ProtectedRoute>
      <div className="pt-8 md:pt-10">
        <AchievementsLibrary />
      </div>
    </ProtectedRoute>
  );
}
