"use client";

import { cn } from "@/lib/utils";

export function WorkspaceScaffold({
  title,
  subtitle,
  actions,
  children,
  rail,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  rail?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1380px] px-4 py-5 sm:px-6 lg:px-8", className)}>
      <header className="mb-5 flex flex-col gap-4 border-b border-border/60 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Analogix Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2.15rem]">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>

      <div className={cn("grid grid-cols-1 gap-6", rail ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "")}>
        <div>{children}</div>
        {rail ? <aside className="space-y-4">{rail}</aside> : null}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border/60 bg-card/55 p-4 sm:p-5", className)}>
      {title ? <h2 className="text-lg font-semibold tracking-tight">{title}</h2> : null}
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
