import ProtectedRoute from "@/components/ProtectedRoute";
import Chat from "@/views/Chat";
import { Suspense } from "react";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <Chat />
      </Suspense>
    </ProtectedRoute>
  );
}
