'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Sidebar from './Sidebar';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isDriver, setIsDriver] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const supabase = createClient();
  
  // Immediately determine if this is a driver route
  const isDriverRoute = pathname === '/driver' || pathname?.startsWith('/driver/');
  const isLoginRoute = pathname?.startsWith('/login');
  
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setIsDriver(false);
        setIsChecking(false);
        return;
      }

      // Skip driver status check if on login page to prevent redirect loop
      if (isLoginRoute) {
        setIsDriver(false);
        setIsChecking(false);
        return;
      }

      try {
        // Check if user is a driver and their status
        const { data: driverData, error } = await supabase
          .from('drivers')
          .select('id, driver_status')
          .eq('auth_user_id', user.id)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no record exists

        // Handle case where auth_user_id column doesn't exist yet (migration not run)
        if (error && (error.code === 'PGRST116' || error.message?.includes('auth_user_id'))) {
          console.log('Driver table migration not run yet, treating as admin');
          setIsDriver(false);
          setIsChecking(false);
          return;
        }

        // Handle other errors (like RLS policy issues)
        if (error) {
          console.log('Error querying drivers table, treating as admin:', error);
          setIsDriver(false);
          setIsChecking(false);
          return;
        }

        // If driver exists but is inactive, log them out (only if not on login page)
        if (driverData && driverData.driver_status === 'inactive') {
          console.log('Driver is inactive, logging out...');
          await signOut();
          window.location.replace('/login');
          return;
        }

        // Check if user is an active driver
        const userIsDriver = !error && !!driverData && driverData.driver_status === 'active';
        setIsDriver(userIsDriver);

        // Immediate redirect for role mismatches
        if (userIsDriver && !isDriverRoute) {
          // Driver trying to access admin route - immediate redirect
          console.log('Driver accessing admin route, redirecting...');
          window.location.replace('/driver');
          return;
        }

        if (!userIsDriver && isDriverRoute) {
          // Non-driver trying to access driver route - immediate redirect
          console.log('Non-driver accessing driver route, redirecting...');
          window.location.replace('/');
          return;
        }

      } catch (error) {
        console.error('Error checking user role:', error);
        // If there's an error (like column doesn't exist), treat as admin
        setIsDriver(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkUserRole();
  }, [user, pathname, isDriverRoute, isLoginRoute, supabase, signOut]);

  // Show nothing while checking to prevent any flash
  if (isChecking && user) {
    return (
      <div className="min-h-screen bg-white">
        {/* Completely blank while checking */}
      </div>
    );
  }

  // For driver routes and login page, render without sidebar
  if (isDriverRoute || isLoginRoute) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }
  
  // For admin routes, only show if user is confirmed to not be a driver
  if (isDriver === false || !user) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    );
  }

  // Fallback - show blank while determining role
  return (
    <div className="min-h-screen bg-white">
      {/* Blank fallback */}
    </div>
  );
} 