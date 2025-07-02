import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientRoot from "./ClientRoot";
import { NAV_ITEMS } from "../utils/constants";
import { AuthProvider } from "../contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mini Dispatch Dashboard",
  description: "A modern dispatch management system for logistics operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Navigation items are now imported from constants

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100`}>
        <AuthProvider>
          <ClientRoot>
            <AuthGuard>
              <div className="min-h-screen flex">
                <Sidebar />
                {/* Main content */}
                <main className="flex-1 p-8">{children}</main>
              </div>
            </AuthGuard>
          </ClientRoot>
        </AuthProvider>
      </body>
    </html>
  );
}
