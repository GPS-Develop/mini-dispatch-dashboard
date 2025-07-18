'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  
  // Create supabase client only once and memoize it
  const supabase = useMemo(() => createClient(), []);
  
  // Use ref to track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true);

  // Optimized driver status check - only for drivers, with longer intervals
  const lastStatusCheckRef = useRef<number>(0);
  const isDriverRef = useRef<boolean | null>(null);
  
  const checkDriverStatus = useCallback(async () => {
    // Skip if component unmounted
    if (!mountedRef.current) return;
    
    const now = Date.now();
    // Throttle checks to max once per 30 seconds
    if (now - lastStatusCheckRef.current < 30000) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    
    // Skip check if on login page to prevent redirect loop
    if (window.location.pathname.startsWith('/login')) return;

    try {
      // Only check once if user is driver, cache the result
      if (isDriverRef.current === null) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('driver_status')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();
        
        isDriverRef.current = !!driverData;
      }
      
      // Only continue checking if user is actually a driver
      if (!isDriverRef.current) return;
      
      lastStatusCheckRef.current = now;
      
      const { data: driverData, error } = await supabase
        .from('drivers')
        .select('driver_status')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (error || !mountedRef.current) return;

      // If driver exists but is inactive, log them out
      if (driverData && driverData.driver_status === 'inactive') {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore errors in status check - fail silently in production
    }
  }, [supabase]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mountedRef.current) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mountedRef.current) {
          setUser(session?.user ?? null);
          setLoading(false);
          
          // Reset driver cache on auth changes
          isDriverRef.current = null;
        }
      }
    );

    // Check driver status every 2 minutes (reduced frequency)
    const statusCheckInterval = setInterval(checkDriverStatus, 120000);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearInterval(statusCheckInterval);
    };
  }, [checkDriverStatus, supabase.auth]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, [supabase.auth]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  }, [supabase.auth]);

  const signOut = useCallback(async () => {
    // Reset driver cache on sign out
    isDriverRef.current = null;
    const { error } = await supabase.auth.signOut();
    return { error };
  }, [supabase.auth]);

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }), [user, loading, signIn, signUp, signOut]);

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