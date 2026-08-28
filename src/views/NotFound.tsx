"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Compass, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", pathname);
  }, [pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Compass className="h-6 w-6 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Nothing here
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          That page doesn&apos;t exist, or has moved somewhere else.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
