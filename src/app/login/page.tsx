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
  const [isInviteFlow, setIsInviteFlow] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Check for invite flow in URL hash and process the session
    const checkInviteFlow = async () => {
      const hash = window.location.hash;
      console.log('URL hash:', hash);
      
      if (hash.includes('type=invite') || hash.includes('type=recovery')) {
        console.log('Invite flow detected in URL');
        setIsInviteFlow(true);
        
        // Parse the hash parameters
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        console.log('Hash params:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
        
        if (accessToken && refreshToken) {
          try {
            // Set the session manually using the tokens from the URL
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            console.log('Session set result:', { data, error });
            
            if (error) {
              console.error('Error setting session:', error);
              setError('Failed to process invitation. Please try again.');
            } else {
              console.log('Session set successfully:', data.session?.user?.email);
            }
          } catch (err) {
            console.error('Exception setting session:', err);
            setError('Failed to process invitation. Please try again.');
          }
        } else {
          console.error('Missing tokens in URL hash');
          setError('Invalid invitation link. Please try again.');
        }
        
        setIsCheckingSession(false);
      } else {
        setIsCheckingSession(false);
      }
    };

    checkInviteFlow();
  }, [supabase]);

  useEffect(() => {
    // Redirect to dashboard if already authenticated and not in invite flow
    if (user && !isInviteFlow && !isCheckingSession) {
      console.log('User authenticated, checking role...');
      // Check if this is a driver by looking for their driver record
      const checkUserRole = async () => {
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('*')
          .eq('auth_user_id', user.id)
          .eq('driver_status', 'active')
          .single();

        console.log('Driver lookup for redirect:', { driverData, driverError });

        if (driverData) {
          console.log('Redirecting to /driver');
          window.location.href = '/driver';
        } else {
          console.log('Redirecting to admin dashboard');
          window.location.href = '/';
        }
      };

      checkUserRole();
    }
  }, [user, router, supabase, isInviteFlow, isCheckingSession]);

  useEffect(() => {
    // Listen for auth state changes, but avoid conflicts with invite flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user && !isInviteFlow && !isCheckingSession) {
        console.log('Auth state change - SIGNED_IN, checking role...');
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .eq('driver_status', 'active')
          .single();

        console.log('Auth state change - Driver lookup:', { driverData, driverError });

        if (driverData) {
          console.log('Auth state change - Redirecting to /driver');
          window.location.href = '/driver';
        } else {
          console.log('Auth state change - Redirecting to admin dashboard');
          window.location.href = '/';
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase, isInviteFlow, isCheckingSession]);

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate passwords
      if (!password || !confirmPassword) {
        setError('Please fill in all fields');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      console.log('Updating password for user...');
      // Update user password
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update error:', error);
        setError(error.message);
        return;
      }

      // Success - redirect based on user role
      if (data.user) {
        console.log('Password updated successfully, checking role...');
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .eq('driver_status', 'active')
          .single();

        console.log('Driver lookup after password setup:', { driverData, driverError });

        if (driverData) {
          console.log('Driver found, redirecting to /driver');
          // Use window.location for immediate redirect without flash
          window.location.href = '/driver';
        } else {
          console.log('No driver found, redirecting to admin dashboard');
          window.location.href = '/';
        }
      }

    } catch (err) {
      console.error('Password setup error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session for invite flow
  if (isInviteFlow && isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Setting up your account...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we prepare your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show password setup form for invite flow
  if (isInviteFlow && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Set Your Password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Welcome! Please set a password for your account.
            </p>
          </div>
          
          <div className="bg-white py-8 px-6 shadow rounded-lg">
            <form onSubmit={handlePasswordSetup} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your new password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm your new password"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting Password...' : 'Set Password'}
              </button>
            </form>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-700 text-xs">
                <strong>Security Tip:</strong> Choose a strong password with at least 6 characters. 
                You can change this password later in your account settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback message if invite flow but no user session yet
  if (isInviteFlow && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Processing Invitation
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please wait while we process your invitation link...
            </p>
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Mini Dispatch
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
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
            redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'}
            onlyThirdPartyProviders={false}
            magicLink={false}
            showLinks={true}
            view="sign_in"
            socialLayout="horizontal"
          />
          
          {/* Auth UI will handle sign up/sign in toggle automatically */}
        </div>
      </div>
    </div>
  );
} 