"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

/**
 * ResponsiveSheet renders a centered Dialog on desktop and a drag-to-dismiss
 * bottom sheet (vaul) on mobile. Same API as shadcn Dialog/Drawer.
 */
export const ResponsiveSheet = ({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <Drawer open={open} onOpenChange={onOpenChange}>{children}</Drawer>;
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>{children}</Dialog>;
};

const ResponsiveSheetTrigger = ({
  asChild = true,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) => {
  const isMobile = useIsMobile();
  if (isMobile) return <DrawerTrigger asChild={asChild} {...props} />;
  return <DialogTrigger asChild={asChild} {...props} />;
};

const ResponsiveSheetClose = ({
  asChild = true,
  ...props
}: React.ComponentProps<typeof DialogClose>) => {
  const isMobile = useIsMobile();
  if (isMobile) return <DrawerClose asChild={asChild} {...props} />;
  return <DialogClose asChild={asChild} {...props} />;
};

const ResponsiveSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <DrawerContent className={cn("max-h-[85vh] overflow-y-auto", className)} {...props}>
        {children}
      </DrawerContent>
    );
  }
  return (
    <DialogContent ref={ref} className={className} {...props}>
      {children}
    </DialogContent>
  );
});
ResponsiveSheetContent.displayName = "ResponsiveSheetContent";

const ResponsiveSheetHeader = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) => {
  const isMobile = useIsMobile();
  if (isMobile) return <DrawerHeader className={className} {...props} />;
  return <DialogHeader className={className} {...props} />;
};

const ResponsiveSheetFooter = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) => {
  const isMobile = useIsMobile();
  if (isMobile) return <DrawerFooter className={className} {...props} />;
  return <DialogFooter className={className} {...props} />;
};

const ResponsiveSheetTitle = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) => {
  const isMobile = useIsMobile();
  if (isMobile) return <DrawerTitle className={className} {...props} />;
  return <DialogTitle className={className} {...props} />;
};

const ResponsiveSheetDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) => {
  const isMobile = useIsMobile();
  if (isMobile) return <DrawerDescription className={className} {...props} />;
  return <DialogDescription className={className} {...props} />;
};

const ResponsiveSheetPortal = ({
  ...props
}: React.ComponentProps<typeof DialogPortal>) => {
  const isMobile = useIsMobile();
  if (isMobile) return <DrawerPortal {...props} />;
  return <DialogPortal {...props} />;
};

const ResponsiveSheetOverlay = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogOverlay>) => {
  const isMobile = useIsMobile();
  if (isMobile) return <DrawerOverlay className={className} {...props} />;
  return <DialogOverlay className={className} {...props} />;
};

export {
  ResponsiveSheetPortal,
  ResponsiveSheetOverlay,
  ResponsiveSheetTrigger,
  ResponsiveSheetClose,
  ResponsiveSheetContent,
  ResponsiveSheetHeader,
  ResponsiveSheetFooter,
  ResponsiveSheetTitle,
  ResponsiveSheetDescription,
};
