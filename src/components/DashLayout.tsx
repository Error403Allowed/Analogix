"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { usePathname } from "next/navigation";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLanding = pathname === "/" || !pathname;
  const isOnboarding = pathname === "/onboarding";
  const isTimerFullscreen = pathname === "/timer";
  const isChat = pathname === "/chat";

  if (isLanding || isOnboarding || isTimerFullscreen || isChat) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      {/* Outer wrapper — full viewport */}
      <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 min-h-0 bg-transparent relative">
          {/* Scroll container — takes remaining height, children scroll within it */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
