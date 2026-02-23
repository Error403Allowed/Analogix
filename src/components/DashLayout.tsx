"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { usePathname } from "next/navigation";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Routes where sidebar should NOT appear
  const isLanding = pathname === "/" || !pathname;
  const isOnboarding = pathname === "/onboarding";
  const isTimerFullscreen = pathname === "/timer";
  const isChat = pathname === "/chat";

  if (isLanding || isOnboarding || isTimerFullscreen || isChat) {
    return <>{children}</>;
  }

  const pageTitle = pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background overflow-hidden font-sans">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 bg-transparent relative">
          <main className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-3">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
