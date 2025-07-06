'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function InviteAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is an admin
    const checkAdminStatus = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        // If users table doesn't exist yet, show error message
        if (error && error.code === 'PGRST116') {
          setError('User roles system not configured. Please run the database migration first.');
          setIsAdmin(false);
          return;
        }

        if (error) {
          console.error('Error checking user role:', error);
          setError(`Error checking admin status: ${error.message}`);
          setIsAdmin(false);
          return;
        }

        if (!userData || userData.role !== 'admin') {
          console.log('User is not admin:', userData);
          router.push('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setError('Unable to verify admin status. Please ensure the database migration has been run.');
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!email || !name) {
        setError('Please fill in all fields');
        return;
      }

      if (!email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }

      const response = await fetch('/api/admins/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send invitation');
        return;
      }

      setSuccess(`Admin invitation sent successfully to ${email}`);
      setEmail('');
      setName('');

    } catch (error) {
      console.error('Invite error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking admin status
  if (isAdmin === null) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // Show error state if not admin or migration not run
  if (isAdmin === false && error) {
    return (
      <div className="page-container-md">
        <div className="card">
          <h1 className="heading-lg">Invite New Admin</h1>
          
          <div className="alert-error">
            <h3 className="invite-admin-error-title">Configuration Required</h3>
            <p className="invite-admin-error-message">{error}</p>
            
            <div className="invite-admin-instructions">
              <p className="invite-admin-instructions-title">To use this feature, you need to:</p>
              <ol className="invite-admin-instructions-list">
                <li>Run the database migration from <code>user-roles-migration.sql</code></li>
                <li>Update your admin email in the migration file</li>
                <li>Disable public signup in Supabase settings</li>
              </ol>
            </div>
            
            <div className="invite-admin-error-actions">
              <button
                onClick={() => router.push('/')}
                className="btn-danger"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-md">
      <div className="card">
        <h1 className="heading-lg">Invite New Admin</h1>
        
        <div className="alert-info">
          <p>
            <strong>Note:</strong> Only existing admins can invite new admins. The invited user will receive an email with instructions to set up their account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-container">
          <div className="edit-form-section">
            <label htmlFor="name" className="label-text">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Enter admin's full name"
              required
            />
          </div>

          <div className="edit-form-section">
            <label htmlFor="email" className="label-text">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="Enter admin's email address"
              required
            />
          </div>

          {error && (
            <div className="alert-error">
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="alert-success">
              <p>{success}</p>
            </div>
          )}

          <div className="button-group-horizontal">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Sending Invitation...' : 'Send Admin Invitation'}
            </button>
            
            <button
              type="button"
              onClick={() => router.push('/')}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="invite-admin-info">
          <h3 className="invite-admin-info-title">What happens next?</h3>
          <ul className="invite-admin-info-list">
            <li>• The invited user will receive an email with an invitation link</li>
            <li>• They&apos;ll be able to set up their password and access the admin dashboard</li>
            <li>• Their account will have full admin privileges</li>
            <li>• You can manage admin accounts from the user management section</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 