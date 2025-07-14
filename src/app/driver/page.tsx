'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Pickup, Delivery } from '@/types';

interface Load {
  id: string;
  reference_id: string;
  load_type: string;
  temperature?: number | null;
  rate: number;
  driver_id: string;
  notes?: string;
  broker_name: string;
  broker_contact: number;
  broker_email: string;
  status: "Scheduled" | "In-Transit" | "Delivered";
  created_at?: string;
  updated_at?: string;
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
  const [pickupsMap, setPickupsMap] = useState<Record<string, Pickup[]>>({});
  const [deliveriesMap, setDeliveriesMap] = useState<Record<string, Delivery[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Scheduled' | 'In-Transit' | 'Delivered'>('All');

  const fetchDriverData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Find the driver by their auth_user_id
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (driverError || !driverData) {
        setError('Driver profile not found. Please contact your dispatcher to set up your account.');
        return;
      }

      // Check if driver is inactive
      if (driverData.driver_status === 'inactive') {
        await signOut();
        router.push('/login');
        return;
      }

      // Check if driver is active
      if (driverData.driver_status !== 'active') {
        setError('Your driver account is not active. Please contact your dispatcher.');
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

      // Fetch loads assigned to this driver (all statuses)
      const { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('*')
        .eq('driver_id', driverData.id)
        .order('created_at', { ascending: false });

      if (loadsError) {
        setError('Failed to fetch assigned loads');
        return;
      }

      setLoads(loadsData || []);

      // Fetch pickup and delivery data for the loads
      if (loadsData && loadsData.length > 0) {
        const loadIds = loadsData.map(l => l.id);
        
        const { data: pickups } = await supabase
          .from("pickups")
          .select("*")
          .in("load_id", loadIds);
          
        const { data: deliveries } = await supabase
          .from("deliveries")
          .select("*")  
          .in("load_id", loadIds);

        const pickupsByLoad: Record<string, Pickup[]> = {};
        const deliveriesByLoad: Record<string, Delivery[]> = {};
        
        pickups?.forEach(p => {
          if (!pickupsByLoad[p.load_id]) pickupsByLoad[p.load_id] = [];
          pickupsByLoad[p.load_id].push(p);
        });
        
        deliveries?.forEach(d => {
          if (!deliveriesByLoad[d.load_id]) deliveriesByLoad[d.load_id] = [];
          deliveriesByLoad[d.load_id].push(d);
        });
        
        setPickupsMap(pickupsByLoad);
        setDeliveriesMap(deliveriesByLoad);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, supabase, router, signOut]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchDriverData();
  }, [user, router, fetchDriverData]);

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

  const formatCompletionDate = (datetime: string) => {
    return new Date(datetime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };


  // Filter loads based on selected status
  const filteredLoads = statusFilter === 'All' 
    ? loads 
    : loads.filter(load => load.status === statusFilter);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="text-muted">Loading your loads...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-container">
        <div className="driver-error-state">
          <div className="driver-error-icon">⚠️</div>
          <div className="alert-error">
            <p>{error}</p>
          </div>
          <div className="button-group-horizontal">
            <button 
              onClick={fetchDriverData}
              className="btn-primary"
            >
              Try Again
            </button>
            <button 
              onClick={handleSignOut}
              className="btn-secondary"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-dashboard">
      {/* Header */}
      <div className="driver-header">
        <div className="driver-header-content">
          <div className="driver-header-info">
            <h1 className="heading-lg">Driver Dashboard</h1>
            {driver && (
              <p className="text-muted">Welcome, {driver.name}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="driver-signout-btn"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="driver-content">
        {/* Stats Cards */}
        <div className="driver-stats-grid">
          <div className="driver-stat-card">
            <div className="driver-stat-number driver-stat-scheduled">
              {loads.filter(l => l.status === 'Scheduled').length}
            </div>
            <div className="driver-stat-label">Scheduled</div>
          </div>
          <div className="driver-stat-card">
            <div className="driver-stat-number driver-stat-transit">
              {loads.filter(l => l.status === 'In-Transit').length}
            </div>
            <div className="driver-stat-label">In Transit</div>
          </div>
          <div className="driver-stat-card">
            <div className="driver-stat-number driver-stat-delivered">
              {loads.filter(l => l.status === 'Delivered').length}
            </div>
            <div className="driver-stat-label">Delivered</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="driver-quick-actions">
          <button
            onClick={() => router.push('/driver/pay-statements')}
            className="driver-action-btn driver-action-btn-primary"
          >
            View Pay Statements
          </button>
        </div>

        {/* Loads List */}
        <div className="driver-loads-section">
          <div className="driver-loads-header">
            <h2 className="heading-md">Your Assigned Loads</h2>
            <div className="driver-filter-container">
              <span className="driver-filter-label">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Scheduled' | 'In-Transit' | 'Delivered')}
                className="input-field-sm"
              >
                <option value="All">All Loads</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In-Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>
          
          <div className="driver-loads-list">
            {filteredLoads.length === 0 ? (
              <div className="driver-empty-state">
                <div className="driver-empty-icon">📦</div>
                <div className="text-muted">
                  {loads.length === 0 
                    ? 'No loads assigned yet' 
                    : `No ${statusFilter.toLowerCase()} loads`}
                </div>
                <div className="text-hint">
                  {loads.length === 0 
                    ? 'Check back later for new assignments' 
                    : 'Try selecting a different filter'}
                </div>
              </div>
            ) : (
              filteredLoads.map((load) => (
                <div key={load.id} className={`driver-load-card ${load.status === 'Delivered' ? 'driver-load-card-completed' : ''}`}>
                  {/* Load Header */}
                  <div className="driver-load-header">
                    <div className="driver-load-title-section">
                      <span className="driver-load-reference">#{load.reference_id}</span>
                      <span className={`driver-load-status driver-load-status-${load.status.toLowerCase().replace('-', '')}`}>
                        {load.status}
                      </span>
                      {load.status === 'Delivered' && (
                        <span className="driver-load-completed">✓ Completed</span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/driver/load/${load.id}`)}
                      className="driver-load-details-btn"
                    >
                      View Details →
                    </button>
                  </div>

                  {/* Route Info */}
                  <div className="driver-load-route">
                    <div className="driver-load-route-item">
                      <div className="driver-load-route-indicator driver-load-pickup-indicator"></div>
                      <div className="driver-load-route-details">
                        <div className="driver-load-route-label">Pickup</div>
                        {(pickupsMap[load.id] || []).map((p, i) => (
                          <div key={p.id || i} className="driver-load-route-location">
                            <div className="driver-load-location-name">{p.name}</div>
                            <div className="driver-load-address">{p.address}, {p.city ? `${p.city}, ` : ''}{p.state} {p.postal_code}</div>
                            <div className="driver-load-datetime">{formatDateTime(p.datetime)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="driver-load-route-item">
                      <div className="driver-load-route-indicator driver-load-delivery-indicator"></div>
                      <div className="driver-load-route-details">
                        <div className="driver-load-route-label">Delivery</div>
                        {(deliveriesMap[load.id] || []).map((d, i) => (
                          <div key={d.id || i} className="driver-load-route-location">
                            <div className="driver-load-location-name">{d.name}</div>
                            <div className="driver-load-address">{d.address}, {d.city ? `${d.city}, ` : ''}{d.state} {d.postal_code}</div>
                            <div className="driver-load-datetime">{formatDateTime(d.datetime)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Load Details */}
                  <div className="driver-load-details">
                    <div className="driver-load-detail-item">
                      <div className="driver-load-detail-label">Load Type</div>
                      <div className="driver-load-detail-value">{load.load_type}</div>
                    </div>
                    <div className="driver-load-detail-item">
                      <div className="driver-load-detail-label">Rate</div>
                      <div className="driver-load-detail-value driver-load-rate">${load.rate.toLocaleString()}</div>
                    </div>
                  </div>

                  {load.temperature && (
                    <div className="driver-load-temperature">
                      <div className="driver-load-detail-label">Temperature</div>
                      <div className="driver-load-detail-value">{load.temperature}°F</div>
                    </div>
                  )}

                  {load.status === 'Delivered' && load.updated_at && (
                    <div className="driver-load-completion">
                      <div className="driver-load-detail-label">Completed On</div>
                      <div className="driver-load-detail-value driver-load-completion-date">{formatCompletionDate(load.updated_at)}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 