"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AgentPanel from "@/components/AgentPanel";
import { TabsProvider, useTabs, pathMeta } from "@/context/TabsContext";
import TabBar from "@/components/TabBar";
import { useEffect, useCallback, useState, useRef } from "react";

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

// Global store for page components (using module-level state)
// This persists across renders but resets on page reload
let pageComponentStore = new Map<string, React.ReactNode>();
let pageInitialized = new Map<string, boolean>();
let pageMounted = new Map<string, boolean>(); // Track if component has mounted
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

// PageCache - stores page component instances by path
// Each path gets its own React component tree that persists across tab switches
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
  const [, forceUpdate] = useState({});
  const hasMountedRef = useRef(false);

  // Mark this component as mounted after first render
  useEffect(() => {
    hasMountedRef.current = true;
    pageMounted.set(path, true);
    // Force update to show cached content if available
    forceUpdate({});
  }, [path]);

  // Subscribe to updates
  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Cache the current children when active and mounted
  // This ensures we cache a fully-hydrated component tree
  if (isActive && hasMountedRef.current) {
    pageComponentStore.set(path, children);
    pageInitialized.set(path, true);
  }

  // Get cached content for this path
  const cachedChildren = pageComponentStore.get(path);
  const isInitialized = pageInitialized.get(path);
  const isMounted = pageMounted.get(path);

  // Show cached content if we have it and this path has been mounted before
  // Otherwise show live children (initial render)
  const showCached = isInitialized && isMounted && cachedChildren;
  const content = showCached ? cachedChildren : children;

  // Show this tab if it's active, OR if activePath is null (initial render - show all to avoid blank page)
  // This prevents the blank page issue when activePath hasn't been set yet
  const shouldShow = isActive || activePath === null;

  return (
    <div
      style={{
        display: shouldShow ? "block" : "none",
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
