"use client";
import { useEffect, useState, useCallback } from "react";
import { useLoads } from "../features/loads/LoadContext";
import { useDrivers } from "../features/drivers/DriverContext";
import { createClient } from "../utils/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { Pickup, Delivery } from "../types";
import { SkeletonCard, SkeletonTable } from "../components/Skeleton/Skeleton";
import { EmptyActivity } from "../components/EmptyState/EmptyState";
import { useRouter } from "next/navigation";

interface Activity {
  id: string;
  activity_type: 'status_update' | 'document_upload';
  driver_name: string;
  load_reference_id: string;
  description: string;
  timestamp: string;
}


export default function Home() {
  const { loads } = useLoads();
  const { drivers } = useDrivers();
  const { user } = useAuth();
  const router = useRouter();
  const [pickupsMap, setPickupsMap] = useState<Record<string, Pickup[]>>({});
  const [deliveriesMap, setDeliveriesMap] = useState<Record<string, Delivery[]>>({});
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const supabase = createClient();

  const upcomingLoads = loads
    .filter((load) => load.status === "Scheduled")
    .sort((a, b) => new Date(a.pickup_datetime).getTime() - new Date(b.pickup_datetime).getTime());

  const fetchAllPickupsDeliveries = useCallback(async () => {
      if (upcomingLoads.length === 0) return;
      const loadIds = upcomingLoads.map(l => l.id);
      const { data: pickups } = await supabase.from("pickups").select("*").in("load_id", loadIds);
      const { data: deliveries } = await supabase.from("deliveries").select("*").in("load_id", loadIds);
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
  }, [upcomingLoads, supabase]);

  useEffect(() => {
    fetchAllPickupsDeliveries();
  }, [fetchAllPickupsDeliveries]);

  // Fetch recent activities from database
  const fetchRecentActivities = useCallback(async () => {
      try {
        setActivitiesLoading(true);
        
        // Simply get all recent activities from the database
        const { data: activities, error } = await supabase
          .from('recent_activities')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching recent activities:', error);
          return;
        }

        setRecentActivities(activities || []);
      } catch (error) {
        console.error('Error fetching recent activities:', error);
      } finally {
        setActivitiesLoading(false);
      }
  }, [supabase]);

  useEffect(() => {
    fetchRecentActivities();
    
    // Set up periodic refresh every 30 seconds to catch new activities
    const interval = setInterval(fetchRecentActivities, 30000);
    
    return () => clearInterval(interval);
  }, [fetchRecentActivities]);

  function getDriverName(driver_id: string) {
    const driver = drivers.find((d) => d.id === driver_id);
    if (!driver) return driver_id;
    if (driver.driver_status && driver.driver_status !== "active") {
      return `${driver.name} (${driver.driver_status.charAt(0).toUpperCase() + driver.driver_status.slice(1)})`;
    }
    return driver.name;
  }

  const clearAllActivities = useCallback(async () => {
    try {
      // Delete all activities from the database
      const { error } = await supabase
        .from('recent_activities')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) {
        console.error('Error clearing activities:', error);
        return;
      }

      // Clear the local state
      setRecentActivities([]);
      
    } catch (error) {
      console.error('Error clearing activities:', error);
    }
  }, [supabase]);

  return (
    <>
      <div className="page-container-xl">
        <div className="page-header">
          <h1 className="heading-xl">Dashboard</h1>
        </div>
        <div className="dashboard-grid">
          {/* Upcoming Loads */}
          <section className="dashboard-section">
            <h2 className="heading-lg">Upcoming Loads</h2>
            <div className="dashboard-card-list">
              {upcomingLoads.length === 0 ? (
                <div className="dashboard-empty-state">
                  <div className="text-muted">No upcoming loads.</div>
                </div>
              ) : (
                upcomingLoads.map((load) => (
                  <div
                    key={load.id}
                    className="dashboard-load-card"
                  >
                    <div className="dashboard-load-header">Load #{load.reference_id}</div>
                    <div className="dashboard-load-detail">
                      <span className="dashboard-load-label">Driver:</span> 
                      <span className="dashboard-load-value">{getDriverName(load.driver_id)}</span>
                    </div>
                    <div className="dashboard-load-detail">
                      <span className="dashboard-load-label">Pickups:</span>
                      <ol className="dashboard-load-list">
                        {(pickupsMap[load.id] || []).map((p, i) => (
                          <li key={p.id || i}>{p.address}, {p.city ? `${p.city}, ` : ''}{p.state} ({p.datetime})</li>
                        ))}
                      </ol>
                    </div>
                    <div className="dashboard-load-detail">
                      <span className="dashboard-load-label">Deliveries:</span>
                      <ol className="dashboard-load-list">
                        {(deliveriesMap[load.id] || []).map((d, i) => (
                          <li key={d.id || i}>{d.address}, {d.city ? `${d.city}, ` : ''}{d.state} ({d.datetime})</li>
                        ))}
                      </ol>
                    </div>
                    <div className="dashboard-load-status">Status: {load.status}</div>
                  </div>
                ))
              )}
            </div>
          </section>
          {/* Recent Activity */}
          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h2 className="heading-lg">Recent Activity</h2>
              {recentActivities.length > 0 && (
                <button
                  onClick={clearAllActivities}
                  className="dashboard-clear-btn"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="dashboard-activity-card">
              {activitiesLoading ? (
                <SkeletonCard lines={4} hasAvatar={true} />
              ) : recentActivities.length === 0 ? (
                <EmptyActivity onViewLoads={() => router.push('/loads')} />
              ) : (
                <div className="dashboard-activity-list">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="dashboard-activity-item">
                      <div className="dashboard-activity-header">
                        <span className={`dashboard-activity-indicator ${
                          activity.activity_type === 'status_update' ? 'dashboard-activity-status' : 'dashboard-activity-document'
                        }`}></span>
                        <span className="dashboard-activity-driver">
                          {activity.driver_name}
                        </span>
                        <span className="dashboard-activity-load">
                          Load #{activity.load_reference_id}
                        </span>
                      </div>
                      <div className="dashboard-activity-description">
                        {activity.description}
                      </div>
                      <div className="dashboard-activity-timestamp">
                        {new Date(activity.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
