import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import AppProviders from "@/components/AppProviders";
import "@/index.css";
import "katex/dist/katex.min.css";

import DashLayout from "@/components/DashLayout";

export const metadata: Metadata = {
  title: "Analogix",
  description: "Analogy-based learning platform",
  icons: {
    icon: [
      { url: "/tab-icon.png", type: "image/png" },
    ],
    shortcut: "/tab-icon.png",
    apple: "/tab-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/Logo.png" type="image/png" />
      </head>
      <body>
        <AppProviders>
          <DashLayout>{children}</DashLayout>
        </AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
