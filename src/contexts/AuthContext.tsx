'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Periodic check for inactive drivers (every 30 seconds)
    const checkDriverStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Skip check if on login page to prevent redirect loop
        if (window.location.pathname.startsWith('/login')) {
          return;
        }

        try {
          const { data: driverData, error } = await supabase
            .from('drivers')
            .select('driver_status')
            .eq('auth_user_id', session.user.id)
            .maybeSingle(); // Use maybeSingle() instead of single()

          // If there's an error or no driver record, skip the check
          if (error) {
            console.log('Error checking driver status (treating as admin):', error);
            return;
          }

          // If driver exists but is inactive, log them out
          if (driverData && driverData.driver_status === 'inactive') {
            console.log('Driver status changed to inactive, logging out...');
            await supabase.auth.signOut();
          }
        } catch (error) {
          // Ignore errors in status check
          console.log('Error checking driver status:', error);
        }
      }
    };

    // Check driver status every 30 seconds
    const statusCheckInterval = setInterval(checkDriverStatus, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(statusCheckInterval);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 