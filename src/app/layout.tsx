import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FRC 2026 REBUILT Scouting System",
  description: "Professional scouting application for FRC 2026 REBUILT robotics competition. Track match data, analyze team performance, and make informed alliance selections.",
  keywords: ["FRC", "FIRST Robotics", "2026 REBUILT", "Scouting", "Robotics Competition", "Team Analysis"],
  authors: [{ name: "FRC Scouting Team" }],
  icons: {
    icon: "/frc-logo.png",
  },
  openGraph: {
    title: "FRC 2026 REBUILT Scouting",
    description: "Professional scouting system for FRC 2026 REBUILT competition",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FRC 2026 REBUILT Scouting",
    description: "Professional scouting system for FRC 2026 REBUILT competition",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
