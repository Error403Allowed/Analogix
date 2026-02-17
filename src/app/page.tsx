import Landing from "@/views/Landing";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background text-foreground font-black uppercase tracking-widest">Analogix...</div>}>
      <Landing />
    </Suspense>
  );
}
