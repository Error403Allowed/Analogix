"use client";

import ProtectedRoute from "@/components/layout/ProtectedRoute";
import dynamic from "next/dynamic";
import { ChatSkeleton } from "@/components/layout/PageSkeleton";

const Chat = dynamic(() => import("@/views/Chat"), {
  ssr: false,
  loading: () => <ChatSkeleton />,
});

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <Chat />
    </ProtectedRoute>
  );
}
