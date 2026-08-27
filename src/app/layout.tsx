import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Sora, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import AppProviders from "@/components/layout/AppProviders";
import { ServiceWorkerRegistration } from "@/components/layout/ServiceWorkerRegistration";
import "@/index.css";
import "katex/dist/katex.min.css";

import DashLayout from "@/components/layout/DashLayout";

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

const fontSans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const fontDisplay = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

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
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Analogix" />
      </head>
      <body className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable}`}>
        <AppProviders>
          <DashLayout>{children}</DashLayout>
        </AppProviders>
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  );
}
