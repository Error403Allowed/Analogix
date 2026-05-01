"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TabsProvider, useTabs, pathMeta } from "@/context/TabsContext";
import TabBar from "@/components/TabBar";
import { useEffect, useCallback, useRef } from "react";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLanding          = pathname === "/" || !pathname;
  const isOnboarding       = pathname === "/onboarding";
  const isTimerFullscreen  = pathname === "/timer";
  const isChat             = pathname === "/chat";
  const isCalendar         = pathname === "/calendar";
  if (isLanding || isOnboarding || isTimerFullscreen) {
    return <>{children}</>;
  }

  return (
    <TabsProvider initialPathname={pathname}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full bg-background overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 min-w-0 min-h-0">
            <DashContent isChat={isChat || isCalendar} pathname={pathname}>
              {children}
            </DashContent>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TabsProvider>
  );
};

function DashContent({ children, isChat, pathname }: { children: React.ReactNode; isChat: boolean; pathname: string }) {
  const { openTab, tabs, activeTabId, setActiveTab } = useTabs();
  const router = useRouter();
  const prevPathRef = useRef<string | null>(null);

  const activePath = pathname;

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      const meta = pathMeta(pathname);
      openTab(pathname, meta.label, meta.emoji);
    }
  }, [pathname, openTab]);

  useEffect(() => {
    const matchingTab = tabs.find(t => t.path === pathname);
    if (matchingTab && matchingTab.id !== activeTabId) {
      setActiveTab(matchingTab.id);
    }
  }, [pathname, tabs, activeTabId, setActiveTab]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const renderAllTabs = useCallback(() => {
    return tabs.map((tab) => (
      <PageCache
        key={tab.path}
        path={tab.path}
        activePath={activePath}
      >
        {children}
      </PageCache>
    ));
  }, [tabs, activePath, children]);

  return (
    <>
      <TabBar onNavigate={handleNavigate} />
      <div className={`flex-1 min-h-0 ${isChat ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <motion.div
          key="tab-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
          className={isChat ? 'h-full' : 'min-h-full'}
        >
          {renderAllTabs()}
        </motion.div>
      </div>
    </>
  );
}

function PageCache({
  path,
  activePath,
  children,
}: {
  path: string;
  activePath: string | null;
  children: React.ReactNode;
}) {
  const isActive = path === activePath;
  const frozenRef = useRef<React.ReactNode>(null);

  if (isActive) {
    frozenRef.current = children;
  }

  const content = frozenRef.current;
  if (!content) return null;

  return (
    <div
      style={{
        display: isActive ? "block" : "none",
        height: "100%",
      }}
    >
      {content}
    </div>
  );
}