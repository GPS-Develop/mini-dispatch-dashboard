import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import ClientRoot from "./ClientRoot";
import { NAV_ITEMS } from "../utils/constants";

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
        <ClientRoot>
          <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-800 text-white flex flex-col py-6 px-4">
              <div className="text-2xl font-semibold mb-8">Mini Dispatch</div>
              <nav className="flex flex-col gap-2">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="rounded px-3 py-2 text-left hover:bg-gray-700 transition-colors"
                    prefetch={false}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </aside>
            {/* Main content */}
            <main className="flex-1 p-8">{children}</main>
          </div>
        </ClientRoot>
      </body>
    </html>
  );
}
