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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error state if not admin or migration not run
  if (isAdmin === false && error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Invite New Admin</h1>
          
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-red-800 font-medium mb-2">Configuration Required</h3>
            <p className="text-red-700 text-sm mb-4">{error}</p>
            
            <div className="text-sm text-red-600">
              <p className="font-medium mb-2">To use this feature, you need to:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Run the database migration from <code>user-roles-migration.sql</code></li>
                <li>Update your admin email in the migration file</li>
                <li>Disable public signup in Supabase settings</li>
              </ol>
            </div>
            
            <div className="mt-4">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Invite New Admin</h1>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> Only existing admins can invite new admins. The invited user will receive an email with instructions to set up their account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter admin's full name"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter admin's email address"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending Invitation...' : 'Send Admin Invitation'}
            </button>
            
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">What happens next?</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• The invited user will receive an email with an invitation link</li>
            <li>• They'll be able to set up their password and access the admin dashboard</li>
            <li>• Their account will have full admin privileges</li>
            <li>• You can manage admin accounts from the user management section</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 