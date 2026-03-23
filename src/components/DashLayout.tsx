"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AgentPanel from "@/components/AgentPanel";
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
  const isStudyGuideLoading = pathname === "/study-guide-loading";

  if (isLanding || isOnboarding || isTimerFullscreen || isStudyGuideLoading) {
    return <>{children}</>;
  }

  return (
    <TabsProvider initialPathname={pathname}>
      <AgentPanel />
      <SidebarProvider defaultOpen={false}>
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

// SnapshotCache: each tab gets its own frozen snapshot of the page DOM once rendered.
// When a tab becomes inactive we freeze its rendered subtree in a hidden div.
// When it becomes active again we just un-hide it — no re-fetch, no re-render.
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
  // frozen holds the last children snapshot when this tab was active
  const frozenRef = useRef<React.ReactNode>(null);

  // While this tab is active, keep the snapshot up to date
  if (isActive) {
    frozenRef.current = children;
  }

  // If we've never been active (no snapshot yet), don't render anything
  // This avoids rendering wrong content for tabs that haven't been visited
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

function DashContent({ children, isChat, pathname }: { children: React.ReactNode; isChat: boolean; pathname: string }) {
  const { openTab, tabs, activeTabId } = useTabs();
  const router = useRouter();
  const prevPathRef = useRef<string | null>(null);

  // Derive activePath synchronously from tabs state — no ref lag
  const activePath = activeTabId
    ? (tabs.find(t => t.id === activeTabId)?.path ?? null)
    : null;

  // Sync current URL into the tabs system on navigation (only when path changes)
  useEffect(() => {
    // Only open a new tab if the pathname is different from what we have
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      const meta = pathMeta(pathname);
      openTab(pathname, meta.label, meta.emoji);
    }
  }, [pathname, openTab]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  // Render all tabs with their own cached page content
  // Each tab maintains its own React component tree
  const renderAllTabs = useCallback(() => {
    return tabs.map((tab) => (
      <PageCache
        key={tab.path}  // Key by path so each path has its own component tree
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
