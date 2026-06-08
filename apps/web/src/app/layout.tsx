import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import type { ReactNode } from "react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { HideOnDashboard } from "@/components/Layout/HideOnDashboard";
import { AuthProvider } from "@/context/AuthContext";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { SWDevCleanup } from "@/components/ui/SWDevCleanup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Glamly — Book Top Beauty Professionals",
    template: "%s | Glamly",
  },
  description:
    "Discover and book top-rated hairstylists, makeup artists, nail technicians, and beauty professionals near you. Glamly makes beauty booking fast, simple, and seamless.",
  keywords: ["beauty", "booking", "stylist", "makeup", "hair", "nails", "Lagos", "Nigeria"],
  metadataBase: new URL("https://glamly.com"),
  openGraph: {
    title: "Glamly — Book Top Beauty Professionals",
    description: "Discover and book top-rated beauty professionals near you.",
    siteName: "Glamly",
    type: "website",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Glamly",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {/* PWA banners sit outside the scrollable content */}
          <OfflineBanner />
          {/* The admin/studio dashboards supply their own chrome — keep the public
              marketing Navbar/Footer off those route trees. */}
          <HideOnDashboard>
            <Navbar />
          </HideOnDashboard>
          {children}
          <HideOnDashboard>
            <Footer />
          </HideOnDashboard>
          <InstallPrompt />
          {/* Serwist auto-registers the SW in production (next.config). This only
              tidies up a stale SW left over in development. */}
          <SWDevCleanup />
        </AuthProvider>
      </body>
    </html>
  );
}
