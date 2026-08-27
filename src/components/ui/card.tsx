import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card density:
 * - "default" (spacious/calm) is the app-wide standard: generous padding,
 *   larger radius, elevation via a clean border rather than a colored shadow.
 * - "compact" is a deliberate, named exception for Notion-style dense
 *   widget grids (e.g. the dashboard) - tighter padding, smaller radius.
 *   Not a fallback or a mistake - use it intentionally.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: "default" | "compact";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, density = "default", ...props }, ref) => (
    <div
      ref={ref}
      data-density={density}
      className={cn(
        "border bg-card text-card-foreground transition-colors duration-200",
        density === "compact" ? "rounded-xl" : "rounded-2xl hover:border-primary/30",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, density = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5", density === "compact" ? "p-4" : "p-6", className)}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-display text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground leading-relaxed", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, density = "default", ...props }, ref) => (
    <div ref={ref} className={cn(density === "compact" ? "p-4 pt-0" : "p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, density = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center", density === "compact" ? "p-4 pt-0" : "p-6 pt-0", className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
