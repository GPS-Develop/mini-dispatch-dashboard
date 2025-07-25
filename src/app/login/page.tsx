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
  const [isCheckingDriverStatus, setIsCheckingDriverStatus] = useState(false);

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
      setIsCheckingDriverStatus(true);
      
      // Check if this is a driver by looking for their driver record
      const checkUserRole = async () => {
        try {
          const { data: driverData, error: driverError } = await supabase
            .from('drivers')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          console.log('Driver lookup for redirect:', { driverData, driverError });

          // Handle case where auth_user_id column doesn't exist yet (migration not run)
          if (driverError && (driverError.code === 'PGRST116' || driverError.message?.includes('auth_user_id'))) {
            console.log('Driver table migration not run yet, redirecting to admin dashboard');
            window.location.href = '/';
            return;
          }

          // If driver exists but is inactive, show error and sign out
          if (driverData && driverData.driver_status === 'inactive') {
            console.log('Driver is inactive, showing error message');
            await supabase.auth.signOut();
            setError('Your driver account has been deactivated. Please contact dispatch for assistance.');
            setIsCheckingDriverStatus(false);
            return;
          }

          // Check if user is an active driver
          if (driverData && driverData.driver_status === 'active') {
            console.log('Redirecting to /driver');
            window.location.href = '/driver';
          } else if (!driverData || driverError) {
            console.log('Redirecting to admin dashboard');
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          setIsCheckingDriverStatus(false);
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
        setIsCheckingDriverStatus(true);
        
        try {
          const { data: driverData, error: driverError } = await supabase
            .from('drivers')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          console.log('Auth state change - Driver lookup:', { driverData, driverError });

          // Handle case where auth_user_id column doesn't exist yet (migration not run)
          if (driverError && (driverError.code === 'PGRST116' || driverError.message?.includes('auth_user_id'))) {
            console.log('Auth state change - Driver table migration not run yet, redirecting to admin dashboard');
            window.location.href = '/';
            return;
          }

          // If driver exists but is inactive, show error and sign out
          if (driverData && driverData.driver_status === 'inactive') {
            console.log('Auth state change - Driver is inactive, showing error message');
            await supabase.auth.signOut();
            setError('Your driver account has been deactivated. Please contact dispatch for assistance.');
            setIsCheckingDriverStatus(false);
            return;
          }

          // Check if user is an active driver
          if (driverData && driverData.driver_status === 'active') {
            console.log('Auth state change - Redirecting to /driver');
            window.location.href = '/driver';
          } else if (!driverData || driverError) {
            console.log('Auth state change - Redirecting to admin dashboard');
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          setIsCheckingDriverStatus(false);
        }
      }

      // Reset checking status when signed out
      if (event === 'SIGNED_OUT') {
        setIsCheckingDriverStatus(false);
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
        setIsCheckingDriverStatus(true);
        
        // Check if this user was invited as an admin (from user metadata)
        const userMetadata = data.user.user_metadata;
        const isAdminInvite = userMetadata?.role === 'admin';
        
        console.log('User metadata:', userMetadata, 'Is admin invite:', isAdminInvite);
        
        // If this was an admin invite, ensure they have admin role in users table
        if (isAdminInvite) {
          console.log('Admin invite detected, updating user role...');
          const { error: roleError } = await supabase
            .from('users')
            .upsert({ 
              id: data.user.id, 
              email: data.user.email, 
              role: 'admin' 
            }, {
              onConflict: 'id'
            });
          
          if (roleError) {
            console.error('Error updating admin role:', roleError);
          } else {
            console.log('Admin role assigned successfully');
          }
        }
        
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .maybeSingle();

        console.log('Driver lookup after password setup:', { driverData, driverError });

        // Handle case where auth_user_id column doesn't exist yet (migration not run)
        if (driverError && (driverError.code === 'PGRST116' || driverError.message?.includes('auth_user_id'))) {
          console.log('Driver table migration not run yet, redirecting to admin dashboard');
          window.location.href = '/';
          return;
        }

        // If driver exists but is inactive, show error and sign out
        if (driverData && driverData.driver_status === 'inactive') {
          console.log('Driver is inactive after password setup, showing error message');
          await supabase.auth.signOut();
          setError('Your driver account has been deactivated. Please contact dispatch for assistance.');
          setIsCheckingDriverStatus(false);
          return;
        }

        // Check if user is an active driver
        if (driverData && driverData.driver_status === 'active') {
          console.log('Driver found, redirecting to /driver');
          window.location.href = '/driver';
        } else if (!driverData || driverError) {
          console.log('No driver found, redirecting to admin dashboard');
          window.location.href = '/';
        }
      }

    } catch (err) {
      console.error('Password setup error:', err);
      setError('An unexpected error occurred');
      setIsCheckingDriverStatus(false);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking driver status
  if (isCheckingDriverStatus) {
    return (
      <div className="page-container-full">
        <div className="login-container">
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <h2 className="heading-lg loading-title">
              Checking account status...
            </h2>
            <p className="text-muted loading-message">
              Please wait while we verify your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking session for invite flow
  if (isInviteFlow && isCheckingSession) {
    return (
      <div className="page-container-full">
        <div className="login-container">
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <h2 className="heading-lg loading-title">
              Setting up your account...
            </h2>
            <p className="text-muted loading-message">
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
      <div className="page-container-full">
        <div className="login-container">
          <div className="login-header">
            <h2 className="heading-xl">
              Set Your Password
            </h2>
            <p className="text-muted">
              Welcome! Please set a password for your account.
            </p>
          </div>
          
          <div className="card">
            <form onSubmit={handlePasswordSetup} className="form-container">
              <div className="form-field">
                <label htmlFor="password" className="label-text">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter your new password"
                  required
                  minLength={6}
                />
              </div>

              <div className="form-field">
                <label htmlFor="confirmPassword" className="label-text">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Confirm your new password"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="alert-error">
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Setting Password...' : 'Set Password'}
              </button>
            </form>

            <div className="alert-info">
              <p>
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
      <div className="page-container-full">
        <div className="login-container">
          <div className="loading-section">
            <h2 className="heading-xl">
              Processing Invitation
            </h2>
            <p className="text-muted">
              Please wait while we process your invitation link...
            </p>
            {error && (
              <div className="alert-error">
                <p>{error}</p>
              </div>
            )}
            <div className="loading-spinner-container">
              <div className="loading-spinner-sm"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-full">
      <div className="login-container">
        <div className="login-header">
          <h2 className="heading-xl">
            Welcome to Mini Dispatch
          </h2>
          <p className="text-muted">
            Sign in to your account
          </p>
        </div>
        
        <div className="card">
          {/* Show error message if inactive driver tries to login */}
          {error && (
            <div className="alert-error login-error">
              <p>{error}</p>
            </div>
          )}
          
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
            providers={[]}
            redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'}
            onlyThirdPartyProviders={false}
            magicLink={false}
            showLinks={false}
            view="sign_in"
            socialLayout="horizontal"
          />
          
          <div className="alert-info">
            <p>
              <strong>Note:</strong> New accounts can only be created by invitation. 
              Contact your administrator if you need access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 