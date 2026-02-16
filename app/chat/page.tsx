import ProtectedRoute from "@/components/ProtectedRoute";
import Chat from "@/pages/Chat";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <Chat />
    </ProtectedRoute>
  );
}
