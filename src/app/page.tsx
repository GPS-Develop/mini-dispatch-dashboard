"use client";
import { useEffect, useState } from "react";
import { useLoads } from "../features/loads/LoadContext";
import { useDrivers } from "../features/drivers/DriverContext";
import { createClient } from "../utils/supabase/client";

interface Activity {
  id: string;
  type: 'status_update' | 'document_upload';
  driver_name: string;
  load_reference_id: string;
  description: string;
  timestamp: string;
}

export default function Home() {
  const { loads } = useLoads();
  const { drivers } = useDrivers();
  const [pickupsMap, setPickupsMap] = useState<Record<string, any[]>>({});
  const [deliveriesMap, setDeliveriesMap] = useState<Record<string, any[]>>({});
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const supabase = createClient();

  const upcomingLoads = loads
    .filter((load) => load.status === "Scheduled")
    .sort((a, b) => new Date(a.pickup_datetime).getTime() - new Date(b.pickup_datetime).getTime());

  useEffect(() => {
    async function fetchAllPickupsDeliveries() {
      if (upcomingLoads.length === 0) return;
      const loadIds = upcomingLoads.map(l => l.id);
      const { data: pickups } = await supabase.from("pickups").select("*").in("load_id", loadIds);
      const { data: deliveries } = await supabase.from("deliveries").select("*").in("load_id", loadIds);
      const pickupsByLoad: Record<string, any[]> = {};
      const deliveriesByLoad: Record<string, any[]> = {};
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
    fetchAllPickupsDeliveries();
  }, [upcomingLoads]);

  // Fetch recent activities from drivers
  useEffect(() => {
    async function fetchRecentActivities() {
      if (drivers.length === 0 || loads.length === 0) return;
      
      try {
        setActivitiesLoading(true);
        const activities: Activity[] = [];

        // Get recent status updates (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: statusUpdates } = await supabase
          .from('loads')
          .select('id, reference_id, driver_id, status, created_at')
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        // Get recent document uploads (last 7 days)
        const { data: documentUploads } = await supabase
          .from('load_documents')
          .select(`
            id,
            load_id,
            file_name,
            uploaded_at,
            loads!inner(reference_id, driver_id)
          `)
          .gte('uploaded_at', sevenDaysAgo.toISOString())
          .order('uploaded_at', { ascending: false })
          .limit(10);

        // Process status updates
        statusUpdates?.forEach((update) => {
          const driver = drivers.find(d => d.id === update.driver_id);
          const driverName = driver?.name || 'Unknown Driver';
          
          activities.push({
            id: `status_${update.id}`,
            type: 'status_update',
            driver_name: driverName,
            load_reference_id: update.reference_id,
            description: `Current status: ${update.status}`,
            timestamp: update.created_at
          });
        });

        // Process document uploads
        documentUploads?.forEach((upload: any) => {
          const driver = drivers.find(d => d.id === upload.loads.driver_id);
          const driverName = driver?.name || 'Unknown Driver';
          
          activities.push({
            id: `doc_${upload.id}`,
            type: 'document_upload',
            driver_name: driverName,
            load_reference_id: upload.loads.reference_id,
            description: `Uploaded document: ${upload.file_name}`,
            timestamp: upload.uploaded_at
          });
        });

        // Sort all activities by timestamp (most recent first)
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setRecentActivities(activities.slice(0, 8)); // Keep only 8 most recent
      } catch (error) {
        console.error('Error fetching recent activities:', error);
      } finally {
        setActivitiesLoading(false);
      }
    }

    fetchRecentActivities();
  }, [drivers, loads, supabase]);

  function getDriverName(driver_id: string) {
    const driver = drivers.find((d) => d.id === driver_id);
    if (!driver) return driver_id;
    if (driver.driver_status && driver.driver_status !== "active") {
      return `${driver.name} (${driver.driver_status.charAt(0).toUpperCase() + driver.driver_status.slice(1)})`;
    }
    return driver.name;
  }

  function clearAllActivities() {
    setRecentActivities([]);
  }

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
                upcomingLoads.map((load, idx) => (
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
                <div className="loading-container">
                  <div className="spinner"></div>
                  <div className="text-muted">Loading activities...</div>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="dashboard-empty-state">
                  <div className="dashboard-empty-icon">📋</div>
                  <div className="text-muted">No recent activity</div>
                  <div className="text-hint">Driver activities will appear here</div>
                </div>
              ) : (
                <div className="dashboard-activity-list">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="dashboard-activity-item">
                      <div className="dashboard-activity-header">
                        <span className={`dashboard-activity-indicator ${
                          activity.type === 'status_update' ? 'dashboard-activity-status' : 'dashboard-activity-document'
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
