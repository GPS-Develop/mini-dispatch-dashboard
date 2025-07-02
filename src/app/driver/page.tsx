'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
// Removed unused import

interface Load {
  id: string;
  reference_id: string;
  pickup_address: string;
  pickup_state: string;
  pickup_datetime: string;
  delivery_address: string;
  delivery_state: string;
  delivery_datetime: string;
  load_type: string;
  temperature?: number | null;
  rate: number;
  driver_id: string;
  notes?: string;
  broker_name: string;
  broker_contact: number;
  broker_email: string;
  status: "Scheduled" | "In-Transit" | "Delivered";
}

interface Driver {
  id: string;
  name: string;
  phone: number;
  email?: string;
  status: "Available" | "On Load";
  pay_rate: number;
  driver_status: "active" | "inactive";
  auth_user_id?: string;
}

export default function DriverDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [loads, setLoads] = useState<Load[]>([]);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchDriverData();
  }, [user, router]);

  const fetchDriverData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Find the driver by their auth_user_id
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('auth_user_id', user.id)
        .eq('driver_status', 'active')
        .single();

      if (driverError || !driverData) {
        setError('Driver profile not found. Please contact your dispatcher to set up your account.');
        return;
      }

      setDriver({
        id: driverData.id,
        name: driverData.name,
        phone: typeof driverData.phone === 'string' ? parseInt(driverData.phone) || 0 : driverData.phone,
        email: driverData.email,
        status: driverData.status,
        pay_rate: typeof driverData.pay_rate === 'string' ? parseFloat(driverData.pay_rate) || 0 : driverData.pay_rate,
        driver_status: driverData.driver_status || 'active',
        auth_user_id: driverData.auth_user_id
      });

      // Fetch loads assigned to this driver
      const { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('*')
        .eq('driver_id', driverData.id)
        .in('status', ['Scheduled', 'In-Transit'])
        .order('pickup_datetime', { ascending: true });

      if (loadsError) {
        setError('Failed to fetch assigned loads');
        return;
      }

      setLoads(loadsData || []);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'In-Transit': return 'bg-yellow-100 text-yellow-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your loads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-2">
            <button 
              onClick={fetchDriverData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
            <button 
              onClick={handleSignOut}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Driver Dashboard</h1>
              {driver && (
                <p className="text-sm text-gray-600">Welcome, {driver.name}</p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {loads.filter(l => l.status === 'Scheduled').length}
            </div>
            <div className="text-sm text-gray-600">Scheduled</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">
              {loads.filter(l => l.status === 'In-Transit').length}
            </div>
            <div className="text-sm text-gray-600">In Transit</div>
          </div>
        </div>

        {/* Loads List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Assigned Loads</h2>
          
          {loads.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-gray-400 text-4xl mb-2">📦</div>
              <p className="text-gray-600">No loads assigned yet</p>
              <p className="text-sm text-gray-500 mt-1">Check back later for new assignments</p>
            </div>
          ) : (
            loads.map((load) => (
              <div key={load.id} className="bg-white rounded-lg shadow-sm border">
                <div className="p-4">
                  {/* Load Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">#{load.reference_id}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(load.status)}`}>
                        {load.status}
                      </span>
                    </div>
                    <button
                      onClick={() => router.push(`/driver/load/${load.id}`)}
                      className="text-blue-600 text-sm font-medium hover:text-blue-800"
                    >
                      View Details →
                    </button>
                  </div>

                  {/* Route Info */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Pickup</div>
                        <div className="text-sm text-gray-600">{load.pickup_address}, {load.pickup_state}</div>
                        <div className="text-xs text-gray-500">{formatDateTime(load.pickup_datetime)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Delivery</div>
                        <div className="text-sm text-gray-600">{load.delivery_address}, {load.delivery_state}</div>
                        <div className="text-xs text-gray-500">{formatDateTime(load.delivery_datetime)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Load Details */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                    <div>
                      <div className="text-xs text-gray-500">Load Type</div>
                      <div className="text-sm font-medium text-gray-900">{load.load_type}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Rate</div>
                      <div className="text-sm font-medium text-green-600">${load.rate.toLocaleString()}</div>
                    </div>
                  </div>

                  {load.temperature && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500">Temperature</div>
                      <div className="text-sm font-medium text-gray-900">{load.temperature}°F</div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 