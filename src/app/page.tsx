"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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

  return (
    <>
      <div className="max-w-3xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upcoming Loads */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Upcoming Loads</h2>
            <div className="flex flex-col gap-4">
              {upcomingLoads.length === 0 ? (
                <div className="text-gray-500">No upcoming loads.</div>
              ) : (
                upcomingLoads.map((load, idx) => (
                  <div
                    key={load.id}
                    className="rounded border bg-white p-4 shadow-sm"
                  >
                    <div className="font-medium">Load #{load.reference_id}</div>
                    <div className="text-sm text-gray-700">Driver: {getDriverName(load.driver_id)}</div>
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">Pickups:</span>
                      <ol className="list-decimal ml-5">
                        {(pickupsMap[load.id] || []).map((p, i) => (
                          <li key={p.id || i}>{p.address}, {p.city ? `${p.city}, ` : ''}{p.state} ({p.datetime})</li>
                        ))}
                      </ol>
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">Deliveries:</span>
                      <ol className="list-decimal ml-5">
                        {(deliveriesMap[load.id] || []).map((d, i) => (
                          <li key={d.id || i}>{d.address}, {d.city ? `${d.city}, ` : ''}{d.state} ({d.datetime})</li>
                        ))}
                      </ol>
                    </div>
                    <div className="text-sm text-gray-500">Status: {load.status}</div>
                  </div>
                ))
              )}
            </div>
          </section>
          {/* Recent Activity */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="rounded border bg-white p-4 shadow-sm">
              {activitiesLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <div className="text-sm text-gray-500">Loading activities...</div>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <div className="text-2xl mb-2">📋</div>
                  <div className="text-sm">No recent activity</div>
                  <div className="text-xs text-gray-400">Driver activities will appear here</div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="border-l-4 border-blue-200 pl-3 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${
                          activity.type === 'status_update' ? 'bg-green-500' : 'bg-blue-500'
                        }`}></span>
                        <span className="font-medium text-sm text-gray-900">
                          {activity.driver_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          Load #{activity.load_reference_id}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 ml-4">
                        {activity.description}
                      </div>
                      <div className="text-xs text-gray-500 ml-4 mt-1">
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
            <div className="mt-4 flex flex-col gap-2">
              <button className="w-full rounded border px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 text-sm font-medium">[ Create invoice ]</button>
              <Link href="/pay-statements">
              <button className="w-full rounded border px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 text-sm font-medium">Generate Pay Statement</button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
