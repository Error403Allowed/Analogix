import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import AppProviders from "@/components/AppProviders";
import "@/index.css";
import "katex/dist/katex.min.css";

import DashLayout from "@/components/DashLayout";

export const metadata: Metadata = {
  title: "Analogix",
  description: "Analogy-based learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <DashLayout>{children}</DashLayout>
        </AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
