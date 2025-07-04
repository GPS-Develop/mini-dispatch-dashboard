import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientRoot from "./ClientRoot";
import { AuthProvider } from "../contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import LayoutWrapper from "@/components/LayoutWrapper";

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
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100`}>
        <AuthProvider>
        <ClientRoot>
            <AuthGuard>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
            </AuthGuard>
        </ClientRoot>
        </AuthProvider>
      </body>
    </html>
  );
}
