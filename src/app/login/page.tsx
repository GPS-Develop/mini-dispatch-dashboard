'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();
  const [authView, setAuthView] = useState<'sign_in' | 'sign_up'>('sign_in');

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Mini Dispatch
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {authView === 'sign_in' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>
        
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3b82f6',
                    brandAccent: '#2563eb',
                  },
                },
              },
              className: {
                container: 'auth-container',
                button: 'auth-button',
                input: 'auth-input',
              },
            }}
            providers={['google']}
            redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/` : '/'}
            onlyThirdPartyProviders={false}
            magicLink={false}
            showLinks={true}
            view={authView}
            socialLayout="horizontal"
          />
          
          {/* Custom toggle if the built-in one doesn't work */}
          <div className="mt-4 text-center">
            <button
              type="button"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
              onClick={() => setAuthView(authView === 'sign_in' ? 'sign_up' : 'sign_in')}
            >
              {authView === 'sign_in' 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 