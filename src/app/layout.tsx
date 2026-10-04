import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "دوريسيو — دوريكم... بشكل حقيقي.",
  description:
    "دوريسيو: منصة دوري كرة القدم الحقيقية للمدارس والأصدقاء. جدول ترتيب، مباريات مباشرة، إحصائيات اللاعبين، الجوائز، ومركز مباريات يعمل دون اتصال.",
  applicationName: "دوريسيو",
  manifest: "/manifest.webmanifest",
  keywords: ["دوري", "كرة قدم", "مباريات", "ترتيب", "دوريسيو", "بطولة"],
  appleWebApp: {
    capable: true,
    title: "دوريسيو",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "دوريسيو — دوريكم... بشكل حقيقي.",
    description: "منصة دوري كرة القدم للمدارس والأصدقاء.",
    type: "website",
    locale: "ar",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0E0C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=Barlow+Condensed:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh bg-ink text-paper">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
