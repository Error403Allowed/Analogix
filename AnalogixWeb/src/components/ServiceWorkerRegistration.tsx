"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    if (!document.readyState.match(/^(complete|interactive)$/)) return;

    const timer = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW registration is best-effort — never break the app over it. */
      });
    }, 2000);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
