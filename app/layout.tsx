import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import AppProviders from "@/components/AppProviders";
import "@/index.css";
import "katex/dist/katex.min.css";

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
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
