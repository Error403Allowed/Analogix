"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Award,
  ChevronRight,
  Flame,
  GraduationCap,
  LifeBuoy,
  ListChecks,
  LogOut,
  Pencil,
  ShieldCheck,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProfileSheet from "@/components/ProfileSheet";
import AppearanceSection from "@/components/AppearanceSection";
import { cn } from "@/lib/utils";

type MenuRow = {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
};

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<Record<string, unknown>>({});
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        setUserData(JSON.parse(localStorage.getItem("userPreferences") || "{}"));
        setStats(JSON.parse(localStorage.getItem("analogix_user_stats_v1") || "{}"));
      } catch {
        /* ignore localStorage errors */
      }
    };
    load();
    window.addEventListener("storage", load);
    window.addEventListener("userPreferencesUpdated", load);
    window.addEventListener("statsUpdated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("userPreferencesUpdated", load);
      window.removeEventListener("statsUpdated", load);
    };
  }, []);

  const name = (userData?.name as string) || user?.email?.split("@")[0] || "Student";
  const avatarUrl = (userData?.avatarUrl as string) || "";
  const streak = Number(stats.currentStreak) || 0;
  const quizzes = Number(stats.quizzesDone) || 0;

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const menu: MenuRow[] = [
    { label: "My Subjects", icon: GraduationCap, href: "/subjects" },
    { label: "Achievements", icon: Trophy, href: "/achievements" },
    { label: "Study Rooms", icon: Users, href: "/rooms" },
    { label: "Edit profile", icon: Pencil, onClick: () => setProfileOpen(true) },
    { label: "Support", icon: LifeBuoy, href: "/support" },
    { label: "Privacy", icon: ShieldCheck, href: "/privacy" },
    { label: "Sign out", icon: LogOut, onClick: handleSignOut, destructive: true },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6"
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-lg shadow-primary/10">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center gradient-primary">
                <User className="h-7 w-7 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black tracking-tight text-foreground">{name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {streak > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                  <Flame className="h-3.5 w-3.5" /> {streak} day streak
                </span>
              )}
              {quizzes > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                  <Award className="h-3.5 w-3.5" /> {quizzes} quizzes
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats rail */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { value: streak, label: "Streak", icon: Flame },
          { value: quizzes, label: "Quizzes", icon: ListChecks },
          { value: name ? name[0]?.toUpperCase() : "—", label: "Student", icon: User },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-4 text-center"
            >
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-lg font-black text-foreground">{stat.value}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </span>
            </div>
          );
        })}
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.075 }}
      >
        <AppearanceSection />
      </motion.div>

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        {menu.map((row, i) => {
          const Icon = row.icon;
          const content = (
            <>
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  row.destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "flex-1 text-left text-sm font-semibold",
                  row.destructive ? "text-destructive" : "text-foreground"
                )}
              >
                {row.label}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </>
          );
          return (
            <div key={row.label}>
              {row.href ? (
                <Link
                  href={row.href}
                  data-testid="profile-menu-item"
                  className={cn(
                    "pressable flex min-h-[56px] items-center gap-3 px-4 transition-colors hover:bg-muted/40",
                    i > 0 && "border-t border-border/60"
                  )}
                >
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  data-testid="profile-menu-item"
                  onClick={row.onClick}
                  className={cn(
                    "pressable flex min-h-[56px] w-full items-center gap-3 px-4 transition-colors hover:bg-muted/40",
                    i > 0 && "border-t border-border/60"
                  )}
                >
                  {content}
                </button>
              )}
            </div>
          );
        })}
      </motion.div>

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
};

export default ProfilePage;
