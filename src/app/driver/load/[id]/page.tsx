'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { formatPhoneForDisplay } from '@/utils/validation';
import { uploadDocument, getLoadDocuments, getSignedUrl } from '@/utils/documentUtils';

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
}

interface Pickup {
  id: string;
  load_id: string;
  address: string;
  city: string;
  state: string;
  datetime: string;
}

interface Delivery {
  id: string;
  load_id: string;
  address: string;
  city: string;
  state: string;
  datetime: string;
}

interface LoadDocument {
  id: string;
  load_id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

export default function DriverLoadDetails() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  
  const [load, setLoad] = useState<Load | null>(null);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [documents, setDocuments] = useState<LoadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchLoadDetails();
  }, [user, router, params.id]);

  const fetchLoadDetails = async () => {
    if (!params.id) return;
    
    try {
      setLoading(true);
      
      // Fetch load details
      const { data: loadData, error: loadError } = await supabase
        .from('loads')
        .select('*')
        .eq('id', params.id)
        .single();

      if (loadError) {
        setError('Load not found');
        return;
      }

      setLoad(loadData);

      // Fetch pickups for this load
      const { data: pickupsData, error: pickupsError } = await supabase
        .from('pickups')
        .select('*')
        .eq('load_id', params.id);

      if (pickupsError) {
        console.error('Error fetching pickups:', pickupsError);
      } else {
        setPickups(pickupsData || []);
      }

      // Fetch deliveries for this load
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('load_id', params.id);

      if (deliveriesError) {
        console.error('Error fetching deliveries:', deliveriesError);
      } else {
        setDeliveries(deliveriesData || []);
      }

      // Fetch documents for this load using the existing utility
      const documentsResult = await getLoadDocuments(supabase, params.id as string);
      if (documentsResult.success && documentsResult.data) {
        setDocuments(documentsResult.data);
      } else {
        console.error('Error fetching documents:', documentsResult.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !load) return;

    const file = files[0];
    
    try {
      setUploading(true);
      setError('');

      // Use the existing upload utility
      const result = await uploadDocument(supabase, load.id, file);
      
      if (result.success && result.data) {
        setDocuments(prev => [result.data!, ...prev]);
      } else {
        setError(result.error || 'Failed to upload document');
      }
      
      // Clear file input
      event.target.value = '';
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const viewDocument = async (document: LoadDocument) => {
    try {
      const result = await getSignedUrl(supabase, document.file_url);
      if (result.success && result.url) {
        window.open(result.url, '_blank');
      } else {
        setError(result.error || 'Failed to open document');
      }
    } catch (err: any) {
      setError('Failed to open document');
    }
  };

  const updateLoadStatus = async (newStatus: "Scheduled" | "In-Transit" | "Delivered") => {
    if (!load) return;

    try {
      const { error } = await supabase
        .from('loads')
        .update({ status: newStatus })
        .eq('id', load.id);

      if (error) throw error;

      setLoad(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to update load status');
    }
  };

  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
          <p className="text-gray-600">Loading load details...</p>
        </div>
      </div>
    );
  }

  if (error && !load) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/driver')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!load) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/driver')}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Load #{load.reference_id}</h1>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(load.status)}`}>
                  {load.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Route Information */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Route Information</h2>
          
          <div className="space-y-4">
            {/* Pickups */}
            <div>
              <div className="font-medium text-gray-900 mb-2">Pickup Locations</div>
              {pickups.length === 0 ? (
                <div className="text-gray-500 text-sm">No pickup locations specified</div>
              ) : (
                pickups.map((pickup, index) => (
                  <div key={pickup.id} className="flex items-start space-x-3 mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="text-gray-600">{pickup.address}</div>
                      <div className="text-gray-600">{pickup.city ? `${pickup.city}, ` : ''}{pickup.state}</div>
                      <div className="text-sm text-gray-500 mt-1">{formatDateTime(pickup.datetime)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Deliveries */}
            <div>
              <div className="font-medium text-gray-900 mb-2">Delivery Locations</div>
              {deliveries.length === 0 ? (
                <div className="text-gray-500 text-sm">No delivery locations specified</div>
              ) : (
                deliveries.map((delivery, index) => (
                  <div key={delivery.id} className="flex items-start space-x-3 mb-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="text-gray-600">{delivery.address}</div>
                      <div className="text-gray-600">{delivery.city ? `${delivery.city}, ` : ''}{delivery.state}</div>
                      <div className="text-sm text-gray-500 mt-1">{formatDateTime(delivery.datetime)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Load Details */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Load Details</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Load Type</div>
              <div className="font-medium text-gray-900">{load.load_type}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Rate</div>
              <div className="font-medium text-green-600">${load.rate.toLocaleString()}</div>
            </div>
            {load.temperature && (
              <div>
                <div className="text-sm text-gray-500">Temperature</div>
                <div className="font-medium text-gray-900">{load.temperature}°F</div>
              </div>
            )}
          </div>

          {load.notes && (
            <div className="mt-4">
              <div className="text-sm text-gray-500">Notes</div>
              <div className="text-gray-900 mt-1">{load.notes}</div>
            </div>
          )}
        </div>

        {/* Broker Information */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Broker Contact</h2>
          
          <div className="space-y-2">
            <div>
              <div className="text-sm text-gray-500">Broker Name</div>
              <div className="font-medium text-gray-900">{load.broker_name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Phone</div>
              <div className="font-medium text-gray-900">
                <a href={`tel:${load.broker_contact}`} className="text-blue-600 hover:text-blue-800">
                  {formatPhoneForDisplay(load.broker_contact)}
                </a>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Email</div>
              <div className="font-medium text-gray-900">
                <a href={`mailto:${load.broker_email}`} className="text-blue-600 hover:text-blue-800">
                  {load.broker_email}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Status Update */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
          
          <div className="flex space-x-2">
            {load.status === 'Scheduled' && (
              <button
                onClick={() => updateLoadStatus('In-Transit')}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 text-sm font-medium"
              >
                Mark In-Transit
              </button>
            )}
            {load.status === 'In-Transit' && (
              <button
                onClick={() => updateLoadStatus('Delivered')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium"
              >
                Mark Delivered
              </button>
            )}
          </div>
        </div>

        {/* Document Upload */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload PDF Documents
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select PDF files (max 10MB each)
              </p>
            </div>

            {uploading && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-blue-700 text-sm">Uploading document...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Documents */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Uploaded Documents ({documents.length})
          </h2>
          
          {documents.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-gray-400 text-3xl mb-2">📄</div>
              <p className="text-gray-600">No documents uploaded yet</p>
              <p className="text-sm text-gray-500">Upload PDFs using the form above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className="text-red-600">📄</div>
                    <div>
                      <div className="font-medium text-gray-900">{doc.file_name}</div>
                      <div className="text-xs text-gray-500">
                        Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => viewDocument(doc)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 