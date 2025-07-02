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
  const { user } = useAuth();
  const [isDriver, setIsDriver] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const supabase = createClient();
  
  // Immediately determine if this is a driver route
  const isDriverRoute = pathname === '/driver' || pathname?.startsWith('/driver/');
  
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setIsDriver(false);
        setIsChecking(false);
        return;
      }

      try {
        // Check if user is a driver
        const { data: driverData, error } = await supabase
          .from('drivers')
          .select('id, driver_status')
          .eq('auth_user_id', user.id)
          .eq('driver_status', 'active')
          .single();

        const userIsDriver = !error && !!driverData;
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
        setIsDriver(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkUserRole();
  }, [user, pathname, isDriverRoute, supabase]);

  // Show nothing while checking to prevent any flash
  if (isChecking && user) {
    return (
      <div className="min-h-screen bg-white">
        {/* Completely blank while checking */}
      </div>
    );
  }

  // For driver routes, render immediately without sidebar
  if (isDriverRoute) {
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