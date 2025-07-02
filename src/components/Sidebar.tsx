'use client';

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_ITEMS } from "../utils/constants";
import Button from "./Button/Button";

export default function Sidebar() {
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <aside className="w-64 bg-gray-800 text-white flex flex-col py-6 px-4">
        <div className="text-2xl font-semibold mb-8">Mini Dispatch</div>
        <div className="text-center text-gray-400">Loading...</div>
      </aside>
    );
  }

  if (!user) {
    return (
      <aside className="w-64 bg-gray-800 text-white flex flex-col py-6 px-4">
        <div className="text-2xl font-semibold mb-8">Mini Dispatch</div>
        <div className="text-center">
          <Link 
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
          >
            Sign In
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col py-6 px-4">
      <div className="text-2xl font-semibold mb-8">Mini Dispatch</div>
      
      {/* User Info */}
      <div className="mb-6 p-3 bg-gray-700 rounded">
        <div className="text-sm text-gray-300">Signed in as:</div>
        <div className="text-sm font-medium truncate">{user.email}</div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded px-3 py-2 text-left hover:bg-gray-700 transition-colors"
            prefetch={false}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Sign Out Button */}
      <div className="mt-auto pt-4">
        <Button
          onClick={handleSignOut}
          variant="danger"
          className="w-full"
        >
          Sign Out
        </Button>
      </div>
    </aside>
  );
} 

 