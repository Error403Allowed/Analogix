"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { TabsProvider, useTabs, pathMeta } from "@/context/TabsContext";
import TabBar from "@/components/TabBar";
import { useEffect, useRef, Suspense } from "react";
import { PageLoader } from "@/components/PageSkeleton";
import dynamic from "next/dynamic";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLanding          = pathname === "/" || !pathname;
  const isOnboarding       = pathname === "/onboarding";
  const isTimerFullscreen  = pathname === "/timer";
  const isAuthPage         = pathname === "/login" || pathname === "/auth/callback";
  const isPublicPage       = pathname === "/support" || pathname === "/privacy";
  const isChatLike         = pathname === "/chat" || pathname === "/calendar";

  if (isLanding || isOnboarding || isTimerFullscreen || isAuthPage || isPublicPage) {
    return <>{children}</>;
  }

  return (
    <TabsProvider initialPathname={pathname}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full bg-background overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 min-w-0 min-h-0">
            <DashContent isChatLike={isChatLike} pathname={pathname}>
              {children}
            </DashContent>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TabsProvider>
  );
};

// Stable page component definitions
const LazyDashboardPage = dynamic(() => import("@/app/dashboard/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading dashboard..." />,
});
const LazyChatPage = dynamic(() => import("@/app/chat/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading tutor..." />,
});
const LazyRoomsPage = dynamic(() => import("@/app/rooms/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading rooms..." />,
});
const LazyFlashcardsPage = dynamic(() => import("@/app/flashcards/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading flashcards..." />,
});
const LazyQuizPage = dynamic(() => import("@/app/quiz/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading quiz..." />,
});
const LazyFormulasPage = dynamic(() => import("@/app/formulas/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading formulas..." />,
});
const LazyResourcesPage = dynamic(() => import("@/app/resources/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading resources..." />,
});
const LazySubjectsPage = dynamic(() => import("@/app/subjects/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading subjects..." />,
});
const LazySubjectDetail = dynamic(() => import("@/views/SubjectDetail"), {
  ssr: false,
  loading: () => <PageLoader message="Loading subject..." />,
});
const LazySubjectDocumentIndex = dynamic(() => import("@/views/SubjectDocumentIndex"), {
  ssr: false,
  loading: () => <PageLoader message="Loading documents..." />,
});
const LazySubjectDocument = dynamic(() => import("@/views/SubjectDocument"), {
  ssr: false,
  loading: () => <PageLoader message="Loading document..." />,
});
const LazyCalendarPage = dynamic(() => import("@/app/calendar/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading calendar..." />,
});
const LazyAchievementsPage = dynamic(() => import("@/app/achievements/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading achievements..." />,
});

const LazyStudyRoomWorkspace = dynamic(() => import("@/views/StudyRoomWorkspace"), {
  ssr: false,
  loading: () => <PageLoader message="Loading room..." />,
});

function getPageForPath(path: string) {
  if (path === "/dashboard") return LazyDashboardPage;
  if (path === "/chat") return LazyChatPage;
  if (path === "/rooms") return LazyRoomsPage;
  if (path.startsWith("/rooms/")) return LazyStudyRoomWorkspace;
  if (path === "/flashcards") return LazyFlashcardsPage;
  if (path === "/quiz") return LazyQuizPage;
  if (path === "/formulas") return LazyFormulasPage;
  if (path === "/resources") return LazyResourcesPage;
  if (path === "/subjects") return LazySubjectsPage;
  if (/^\/subjects\/[^/]+\/document\/[^/]+$/.test(path)) return LazySubjectDocument;
  if (/^\/subjects\/[^/]+\/document$/.test(path)) return LazySubjectDocumentIndex;
  if (/^\/subjects\/[^/]+$/.test(path)) return LazySubjectDetail;
  if (path === "/calendar") return LazyCalendarPage;
  if (path === "/achievements") return LazyAchievementsPage;
  return LazyDashboardPage;
}

function DashContent({ children, isChatLike, pathname }: { children: React.ReactNode; isChatLike: boolean; pathname: string }) {
  const { openTab, tabs, activeTabId, setActiveTab } = useTabs();
  const router = useRouter();
  const prevPathRef = useRef<string | null>(null);

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

  return (
    <>
      <TabBar onNavigate={handleNavigate} />
      <div className="flex-1 min-h-0 relative">
        {tabs.map((tab) => {
          const isActive = tab.path === pathname && tab.id === activeTabId;
          const PageComponent = getPageForPath(tab.path);

          return (
            <motion.div
              key={tab.id}
              initial={false}
              animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 3 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute inset-0"
              style={{
                height: "100%",
                overflow: isChatLike ? "hidden" : "auto",
                pointerEvents: isActive ? "auto" : "none",
                zIndex: isActive ? 1 : 0,
              }}
            >
              <Suspense fallback={<PageLoader message="Loading..." />}>
                <PageComponent />
              </Suspense>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
