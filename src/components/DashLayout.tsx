"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLanding = pathname === "/" || !pathname;
  const isOnboarding = pathname === "/onboarding";
  const isTimerFullscreen = pathname === "/timer";
  const isChat = pathname === "/chat";
  const isStudyGuideLoading = pathname === "/study-guide-loading";

  if (isLanding || isOnboarding || isTimerFullscreen || isChat || isStudyGuideLoading) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 min-h-0 bg-transparent relative">
          {/* Scroll container */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="min-h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
