"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TabsProvider, useTabs, pathMeta } from "@/context/TabsContext";
import TabBar from "@/components/TabBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileAppBar from "@/components/MobileAppBar";
import { useEffect, useRef, useState, Suspense } from "react";
import { PageLoader, ChatSkeleton, DashboardSkeleton, FlashcardsSkeleton, QuizSkeleton, RoomsSkeleton, CalendarSkeleton, AchievementsSkeleton, SubjectsSkeleton, FormulasSkeleton, ResourcesSkeleton } from "@/components/PageSkeleton";
import dynamic from "next/dynamic";

export default function DashLayout({ children: _ }: { children?: React.ReactNode }) {
  void _;
  const pathname = usePathname();

  const isLanding          = pathname === "/" || !pathname;
  const isOnboarding       = pathname === "/onboarding";
  const isTimerFullscreen  = pathname === "/timer";
  const isAuthPage         = pathname === "/login" || pathname === "/auth/callback";
  const isPublicPage       = pathname === "/support" || pathname === "/privacy";
  const isChatLike         = pathname === "/chat" || pathname === "/calendar";

  if (isLanding || isOnboarding || isTimerFullscreen || isAuthPage || isPublicPage) {
    return <>{_}</>;
  }

  return (
    <TabsProvider initialPathname={pathname}>
      <SidebarProvider defaultOpen={true}>
        <RouteProgress />
        <div className="flex h-dvh w-full bg-background overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 min-w-0 min-h-0">
            <DashContent isChatLike={isChatLike} pathname={pathname} />
          </SidebarInset>
          <MobileBottomNav />
        </div>
      </SidebarProvider>
    </TabsProvider>
  );
};

// Stable page component definitions with page-specific skeletons
const LazyDashboardPage = dynamic(() => import("@/app/dashboard/page"), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

// Thin top progress bar shown while a tab/page is loading after navigation,
// so the app never looks frozen during route transitions.
function RouteProgress() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 650);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden pointer-events-none">
      <motion.div
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="h-full bg-primary"
      />
    </div>
  );
}

const LazyChatPage = dynamic(() => import("@/app/chat/page"), {
  ssr: false,
  loading: () => <ChatSkeleton />,
});
const LazyRoomsPage = dynamic(() => import("@/app/rooms/page"), {
  ssr: false,
  loading: () => <RoomsSkeleton />,
});
const LazyFlashcardsPage = dynamic(() => import("@/app/flashcards/page"), {
  ssr: false,
  loading: () => <FlashcardsSkeleton />,
});
const LazyQuizPage = dynamic(() => import("@/app/quiz/page"), {
  ssr: false,
  loading: () => <QuizSkeleton />,
});
const LazyFormulasPage = dynamic(() => import("@/app/formulas/page"), {
  ssr: false,
  loading: () => <FormulasSkeleton />,
});
const LazyResourcesPage = dynamic(() => import("@/app/resources/page"), {
  ssr: false,
  loading: () => <ResourcesSkeleton />,
});
const LazySubjectsPage = dynamic(() => import("@/app/subjects/page"), {
  ssr: false,
  loading: () => <SubjectsSkeleton />,
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
  loading: () => <CalendarSkeleton />,
});
const LazyAchievementsPage = dynamic(() => import("@/app/achievements/page"), {
  ssr: false,
  loading: () => <AchievementsSkeleton />,
});
const LazyStudyPage = dynamic(() => import("@/app/study/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading study hub..." />,
});
const LazyProfilePage = dynamic(() => import("@/app/profile/page"), {
  ssr: false,
  loading: () => <PageLoader message="Loading profile..." />,
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
  if (path === "/study") return LazyStudyPage;
  if (path === "/profile") return LazyProfilePage;
  return LazyDashboardPage;
}

function getPageSkeleton(path: string) {
  if (path === "/dashboard") return <DashboardSkeleton />;
  if (path === "/chat") return <ChatSkeleton />;
  if (path === "/rooms" || path.startsWith("/rooms/")) return <RoomsSkeleton />;
  if (path === "/flashcards") return <FlashcardsSkeleton />;
  if (path === "/quiz") return <QuizSkeleton />;
  if (path === "/formulas") return <FormulasSkeleton />;
  if (path === "/resources") return <ResourcesSkeleton />;
  if (path === "/subjects" || path.startsWith("/subjects/")) return <SubjectsSkeleton />;
  if (path === "/calendar") return <CalendarSkeleton />;
  if (path === "/achievements") return <AchievementsSkeleton />;
  return <PageLoader message="Loading..." />;
}

function DashContent({ isChatLike, pathname }: { isChatLike: boolean; pathname: string }) {
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
      <MobileAppBar />
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
              className="absolute inset-0 pb-14 md:pb-0"
              style={{
                height: "100%",
                overflow: isChatLike ? "hidden" : "auto",
                pointerEvents: isActive ? "auto" : "none",
                zIndex: isActive ? 1 : 0,
              }}
            >
              <Suspense fallback={getPageSkeleton(tab.path)}>
                <PageComponent />
              </Suspense>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
