import ProtectedRoute from "@/components/ProtectedRoute";
import ARVisualiser from "@/views/ARVisualiser";

export default function ARPage() {
  return (
    <ProtectedRoute>
      <ARVisualiser />
    </ProtectedRoute>
  );
}
