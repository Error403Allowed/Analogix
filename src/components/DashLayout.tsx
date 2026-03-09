"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AgentPanel from "@/components/AgentPanel";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLanding          = pathname === "/" || !pathname;
  const isOnboarding       = pathname === "/onboarding";
  const isTimerFullscreen  = pathname === "/timer";
  const isChat             = pathname === "/chat";
  const isStudyGuideLoading = pathname === "/study-guide-loading";

  if (isLanding || isOnboarding || isTimerFullscreen || isStudyGuideLoading) {
    return <>{children}</>;
  }

  return (
    <>
      <AgentPanel />
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-screen w-full bg-background overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 min-w-0 min-h-0">
            <div className={`flex-1 min-h-0 ${isChat ? 'overflow-hidden' : 'overflow-y-auto'}`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className={isChat ? 'h-full' : 'min-h-full'}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </>
  );
}
