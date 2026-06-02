import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import type { ReactNode } from "react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <Navbar />
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
