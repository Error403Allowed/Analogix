"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { pathMeta } from "@/context/TabsContext";

export default function MobileAppBar() {
  const pathname = usePathname();
  const { label } = pathMeta(pathname);

  return (
    <div
      data-testid="mobile-app-bar"
      className="safe-top md:hidden flex h-12 shrink-0 items-center gap-1 border-b border-border bg-background/80 px-1 backdrop-blur-xl"
    >
      <SidebarTrigger className="h-10 w-10 shrink-0" />
      <span className="truncate text-sm font-semibold">{label}</span>
    </div>
  );
}
