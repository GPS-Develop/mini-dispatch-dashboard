'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Pickup, Delivery, LumperService } from '@/types';

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
  created_at: string;
  updated_at: string;
}

interface DriverInternal {
  id: string;
  name: string;
  phone: number;
  email?: string;
  status: "Available" | "On Load";
  pay_rate: number;
  driver_status: "active" | "inactive";
  auth_user_id?: string;
}

interface LoadWithDetails extends Load {
  pickups: Pickup[];
  deliveries: Delivery[];
  lumper_service?: LumperService;
}

export default function DriverPayStatements() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [driver, setDriver] = useState<DriverInternal | null>(null);
  const [deliveredLoads, setDeliveredLoads] = useState<LoadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Set default date range to current month
  useEffect(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
    setEndDate(lastDayOfMonth.toISOString().split('T')[0]);
  }, []);

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

    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, supabase, router, signOut]);

  const fetchDeliveredLoads = useCallback(async (driverId: string) => {
    try {
      // First, fetch all delivered loads for this driver
      const { data: loadsData, error: loadsError } = await supabase
        .from('loads')
        .select('*')
        .eq('driver_id', driverId)
        .eq('status', 'Delivered')
        .order('created_at', { ascending: false });

      if (loadsError) {
        setError(`Failed to fetch delivered loads: ${loadsError.message}`);
        return;
      }

      if (!loadsData) {
        setDeliveredLoads([]);
        return;
      }

      // Filter by date range on the client side if dates are provided
      let filteredLoads = loadsData;
      if (startDate && endDate) {
        const startDateTime = new Date(startDate + 'T00:00:00');
        const endDateTime = new Date(endDate + 'T23:59:59');
        
        filteredLoads = loadsData.filter(load => {
          const loadDate = new Date(load.created_at);
          return loadDate >= startDateTime && loadDate <= endDateTime;
        });
      }

      if (filteredLoads.length === 0) {
        setDeliveredLoads([]);
        return;
      }

      // Fetch pickup and delivery data for the filtered loads
      const loadIds = filteredLoads.map(l => l.id);
      
      const { data: pickups } = await supabase
        .from("pickups")
        .select("*")
        .in("load_id", loadIds);
        
      const { data: deliveries } = await supabase
        .from("deliveries")
        .select("*")  
        .in("load_id", loadIds);

      const { data: lumperServices } = await supabase
        .from("lumper_services")
        .select("*")
        .in("load_id", loadIds);

      const pickupsByLoad: Record<string, Pickup[]> = {};
      const deliveriesByLoad: Record<string, Delivery[]> = {};
      const lumperByLoad: Record<string, LumperService> = {};
      
      pickups?.forEach(p => {
        if (!pickupsByLoad[p.load_id]) pickupsByLoad[p.load_id] = [];
        pickupsByLoad[p.load_id].push(p);
      });
      
      deliveries?.forEach(d => {
        if (!deliveriesByLoad[d.load_id]) deliveriesByLoad[d.load_id] = [];
        deliveriesByLoad[d.load_id].push(d);
      });

      lumperServices?.forEach(l => {
        lumperByLoad[l.load_id] = l;
      });

      // Combine filtered loads with their pickup/delivery details
      const loadsWithDetails: LoadWithDetails[] = filteredLoads.map(load => ({
        ...load,
        pickups: pickupsByLoad[load.id] || [],
        deliveries: deliveriesByLoad[load.id] || [],
        lumper_service: lumperByLoad[load.id]
      }));

      setDeliveredLoads(loadsWithDetails);
    } catch {
      setError('Failed to fetch load details');
    }
  }, [supabase, startDate, endDate]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchDriverData();
  }, [user, router, fetchDriverData]);

  useEffect(() => {
    if (driver) {
      fetchDeliveredLoads(driver.id);
    }
  }, [driver, startDate, endDate, fetchDeliveredLoads]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatLocationString = (locations: (Pickup | Delivery)[]) => {
    if (locations.length === 0) return 'N/A';
    
    return locations.map((location, index) => {
      const name = location.name || '';
      const address = location.address || '';
      const city = location.city || '';
      const state = location.state || '';
      const postalCode = location.postal_code || '';
      
      const locationString = `${name} - ${address}, ${city}, ${state} ${postalCode}`;
      return `${index + 1}. ${locationString}`;
    }).join('\n');
  };

  const formatRoute = (load: LoadWithDetails) => {
    const pickup = formatLocationString(load.pickups);
    const delivery = formatLocationString(load.deliveries);
    return `${pickup} → ${delivery}`;
  };

  // Calculate totals
  const totalEarnings = deliveredLoads.reduce((sum, load) => sum + load.rate, 0);
  const totalLumperReimbursements = deliveredLoads.reduce((sum, load) => {
    if (load.lumper_service?.paid_by_driver && load.lumper_service.driver_amount) {
      return sum + load.lumper_service.driver_amount;
    }
    return sum;
  }, 0);
  const totalPay = totalEarnings + totalLumperReimbursements;
  const totalLoads = deliveredLoads.length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="text-muted">Loading pay statements...</div>
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
            <button
              onClick={() => router.push('/driver')}
              className="driver-back-btn"
            >
              ← Back to Dashboard
            </button>
            <h1 className="heading-lg">Pay Statements</h1>
            {driver && (
              <p className="text-muted">{driver.name}</p>
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
        {/* Date Range Filter */}
        <div className="driver-pay-filter-section">
          <h2 className="heading-md">Select Date Range</h2>
          <div className="driver-date-range-inputs">
            <div className="driver-date-input-group">
              <label htmlFor="start-date" className="label-text">Start Date</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="driver-date-input-group">
              <label htmlFor="end-date" className="label-text">End Date</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="driver-pay-summary-grid">
          <div className="driver-pay-summary-card">
            <div className="driver-pay-summary-number">{totalLoads}</div>
            <div className="driver-pay-summary-label">Loads Delivered</div>
          </div>
          <div className="driver-pay-summary-card">
            <div className="driver-pay-summary-number driver-pay-total-earnings">
              ${totalEarnings.toLocaleString()}
            </div>
            <div className="driver-pay-summary-label">Load Earnings</div>
          </div>
          {totalLumperReimbursements > 0 && (
            <div className="driver-pay-summary-card">
              <div className="driver-pay-summary-number driver-pay-lumper-reimbursements">
                ${totalLumperReimbursements.toLocaleString()}
              </div>
              <div className="driver-pay-summary-label">Lumper Reimbursements</div>
            </div>
          )}
          <div className="driver-pay-summary-card">
            <div className="driver-pay-summary-number driver-pay-total-pay">
              ${totalPay.toLocaleString()}
            </div>
            <div className="driver-pay-summary-label">Total Pay</div>
          </div>
        </div>

        {/* Delivered Loads List */}
        <div className="driver-pay-loads-section">
          <h2 className="heading-md">Delivered Loads Breakdown</h2>
          
          {deliveredLoads.length === 0 ? (
            <div className="driver-pay-empty-state">
              <div className="driver-pay-empty-icon">📊</div>
              <div className="text-muted">No delivered loads found for this period</div>
              <div className="text-hint">
                {startDate && endDate 
                  ? `Try selecting a different date range`
                  : 'Select a date range to view your earnings'}
              </div>
            </div>
          ) : (
            <div className="driver-pay-loads-table">
              <div className="driver-pay-table-header">
                <div className="driver-pay-table-cell driver-pay-table-load">Load #</div>
                <div className="driver-pay-table-cell driver-pay-table-route">Route</div>
                <div className="driver-pay-table-cell driver-pay-table-type">Type</div>
                <div className="driver-pay-table-cell driver-pay-table-date">Completed</div>
                <div className="driver-pay-table-cell driver-pay-table-rate">Total Pay</div>
              </div>
              
              {deliveredLoads.map((load) => (
                <div key={load.id} className="driver-pay-table-row">
                  <div className="driver-pay-table-cell driver-pay-table-load" data-label="Load #">
                    <span className="driver-pay-load-reference">#{load.reference_id}</span>
                  </div>
                  <div className="driver-pay-table-cell driver-pay-table-route" data-label="Route">
                    <div className="driver-pay-route-content">
                      {formatRoute(load)}
                    </div>
                  </div>
                  <div className="driver-pay-table-cell driver-pay-table-type" data-label="Type">
                    <span className="driver-pay-load-type">{load.load_type}</span>
                    {load.temperature && (
                      <span className="driver-pay-temperature">{load.temperature}°F</span>
                    )}
                  </div>
                  <div className="driver-pay-table-cell driver-pay-table-date" data-label="Completed">
                    <span className="driver-pay-completion-date">{formatDateTime(load.created_at)}</span>
                  </div>
                  <div className="driver-pay-table-cell driver-pay-table-rate" data-label="Total Pay">
                    <span className="driver-pay-load-rate">${load.rate.toLocaleString()}</span>
                    {load.lumper_service?.paid_by_driver && load.lumper_service.driver_amount && (
                      <span className="driver-pay-lumper-addition"> (+${load.lumper_service.driver_amount.toLocaleString()})</span>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Total Row */}
              <div className="driver-pay-table-row driver-pay-table-total-row">
                <div className="driver-pay-table-cell driver-pay-table-load">
                  <span className="driver-pay-total-label">Total</span>
                </div>
                <div className="driver-pay-table-cell driver-pay-table-route"></div>
                <div className="driver-pay-table-cell driver-pay-table-type"></div>
                <div className="driver-pay-table-cell driver-pay-table-date">
                  <span className="driver-pay-total-loads">{totalLoads} loads</span>
                </div>
                <div className="driver-pay-table-cell driver-pay-table-rate">
                  <span className="driver-pay-total-amount">${totalEarnings.toLocaleString()}</span>
                  {totalLumperReimbursements > 0 && (
                    <span className="driver-pay-total-lumper-addition"> (+${totalLumperReimbursements.toLocaleString()})</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}