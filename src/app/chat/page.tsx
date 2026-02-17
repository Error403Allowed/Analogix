import ProtectedRoute from "@/components/ProtectedRoute";
import Chat from "@/views/Chat";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <Chat />
    </ProtectedRoute>
  );
}
