'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Periodic check for inactive drivers (every 30 seconds)
  const checkDriverStatus = useCallback(async () => {
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
          // Silently treat as admin - don't log in production
          return;
        }

        // If driver exists but is inactive, log them out
        if (driverData && driverData.driver_status === 'inactive') {
          await supabase.auth.signOut();
        }
      } catch {
        // Ignore errors in status check - fail silently in production
      }
    }
  }, [supabase]);

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

    // Check driver status every 30 seconds
    const statusCheckInterval = setInterval(checkDriverStatus, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(statusCheckInterval);
    };
  }, [checkDriverStatus, supabase.auth]);

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