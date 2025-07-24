// src/app/layout.tsx or src/app/root-layout.tsx (depending on your setup)

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // <- makes font loading non-blocking
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "coLLM - Collaborative LLM",
  description: "A collaborative platform for interacting with LLM applications",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white relative overflow-x-hidden" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {/* Animated background effect */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-purple-900/40 animate-gradient-move" />
          {/* Optionally add a blurred, animated 3D element here later */}
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
