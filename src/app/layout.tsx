import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import AppProviders from "@/components/AppProviders";
import "@/index.css";
import "katex/dist/katex.min.css";

import DashLayout from "@/components/DashLayout";

export const metadata: Metadata = {
  metadataBase: new URL("https://analogix.vercel.app"),
  title: "Analogix",
  description: "AI-powered learning platform for students",
  openGraph: {
    title: "Analogix",
    description: "AI-powered learning platform for students",
    url: "https://analogix.vercel.app",
    siteName: "Analogix",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Analogix - AI Learning Platform",
      },
    ],
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Analogix",
    description: "AI-powered learning platform for students",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/tab-icon.png", type: "image/png" },
    ],
    shortcut: "/tab-icon.png",
    apple: "/tab-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/tab-icon.png" type="image/png" />
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
