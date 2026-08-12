import * as React from "react";
import { cn } from "@/lib/utils";

type PanelProps<C extends React.ElementType> = {
  as?: C;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<C>, "as" | "className">;

const panelFactory = (baseClass: string) => {
  const Panel = <C extends React.ElementType = "div">({
    as,
    className,
    ...props
  }: PanelProps<C>) => {
    const Component = as ?? "div";
    return <Component className={cn(baseClass, className)} {...props} />;
  };

  return Panel;
};

export const Glass = panelFactory("glass");
export const GlassCard = panelFactory("glass-card");
export const DashboardPanel = panelFactory("dashboard-panel");

