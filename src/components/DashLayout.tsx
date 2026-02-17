"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { usePathname } from "next/navigation";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Routes where sidebar should NOT appear
  const isLanding = pathname === "/" || !pathname;
  const isOnboarding = pathname === "/onboarding";

  if (isLanding || isOnboarding) {
    return <>{children}</>;
  }

  const pageTitle = pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden font-sans">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 bg-transparent relative">
          <header className="h-16 flex items-center px-8 gap-4 shrink-0 transition-all duration-300">
            <SidebarTrigger className="-ml-1 text-primary hover:bg-primary/10 rounded-full" />
            <div className="h-4 w-[1px] bg-border/40" />
            <div className="flex-1 min-w-0">
               <h1 className="text-[10px] font-black text-foreground truncate uppercase tracking-[0.4em] opacity-60">
                 {pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2)}
               </h1>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
