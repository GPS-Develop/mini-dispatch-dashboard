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
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setIsLoading(false);
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

        // If user is a driver and trying to access admin routes, redirect to driver dashboard
        if (userIsDriver && pathname !== '/driver' && !pathname?.startsWith('/driver/')) {
          console.log('Driver attempting to access admin route, redirecting to /driver');
          router.push('/driver');
          return;
        }

        // If user is NOT a driver and trying to access driver routes, redirect to admin dashboard
        if (!userIsDriver && (pathname === '/driver' || pathname?.startsWith('/driver/'))) {
          console.log('Non-driver attempting to access driver route, redirecting to admin dashboard');
          router.push('/');
          return;
        }

      } catch (error) {
        console.error('Error checking user role:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, [user, pathname, router, supabase]);

  // Show loading while checking user role
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Check if we're on a driver mobile route
  const isDriverRoute = pathname === '/driver' || pathname?.startsWith('/driver/');
  
  if (isDriverRoute) {
    // Mobile driver layout - no sidebar, full width
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }
  
  // Admin layout - with sidebar
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
} 