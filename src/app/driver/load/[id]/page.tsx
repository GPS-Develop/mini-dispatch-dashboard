'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const fetchLoadDetails = useCallback(async () => {
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
      console.error('Error fetching load details:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [params.id, supabase]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchLoadDetails();
  }, [user, router, fetchLoadDetails]);

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
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
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
    } catch (err) {
      console.error('Error opening document:', err);
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

      // Log status update activity - only if status changed from "Scheduled"
      if (load.status !== "Scheduled") {
        try {
          const driverName = user?.user_metadata?.name || 'Unknown Driver';
          
          await supabase.rpc('add_status_update_activity', {
            p_driver_name: driverName,
            p_load_reference_id: load.reference_id,
            p_new_status: newStatus
          });
        } catch (activityError) {
          console.error('Failed to log status update activity:', activityError);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update load status';
      setError(errorMessage);
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



  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="text-muted">Loading load details...</div>
      </div>
    );
  }

  if (error && !load) {
    return (
      <div className="loading-container">
        <div className="driver-error-state">
          <div className="driver-error-icon">⚠️</div>
          <div className="alert-error">
            <p>{error}</p>
          </div>
          <button 
            onClick={() => router.push('/driver')}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!load) return null;

  return (
    <div className="driver-dashboard">
      {/* Header */}
      <div className="driver-header">
        <div className="driver-header-content">
          <div className="driver-load-details-header">
            <button
              onClick={() => router.push('/driver')}
              className="driver-back-btn"
            >
              ← Back
            </button>
            <div className="driver-load-details-title">
              <h1 className="heading-lg">Load #{load.reference_id}</h1>
              <span className={`driver-load-status driver-load-status-${load.status.toLowerCase().replace('-', '')}`}>
                {load.status}
              </span>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="driver-signout-btn"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="driver-content">
        {/* Error Display */}
        {error && (
          <div className="alert-error">
            <p>{error}</p>
          </div>
        )}

        {/* Route Information */}
        <div className="driver-load-details-section">
          <h2 className="heading-md">Route Information</h2>
          
          <div className="driver-route-sections">
            {/* Pickups */}
            <div className="driver-route-section">
              <div className="driver-route-section-title">Pickup Locations</div>
              {pickups.length === 0 ? (
                <div className="text-muted">No pickup locations specified</div>
              ) : (
                pickups.map((pickup) => (
                  <div key={pickup.id} className="driver-load-route-item">
                    <div className="driver-load-route-indicator driver-load-pickup-indicator"></div>
                    <div className="driver-load-route-details">
                      <div className="driver-load-address">{pickup.address}</div>
                      <div className="driver-load-address">{pickup.city ? `${pickup.city}, ` : ''}{pickup.state}</div>
                      <div className="driver-load-datetime">{formatDateTime(pickup.datetime)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Deliveries */}
            <div className="driver-route-section">
              <div className="driver-route-section-title">Delivery Locations</div>
              {deliveries.length === 0 ? (
                <div className="text-muted">No delivery locations specified</div>
              ) : (
                deliveries.map((delivery) => (
                  <div key={delivery.id} className="driver-load-route-item">
                    <div className="driver-load-route-indicator driver-load-delivery-indicator"></div>
                    <div className="driver-load-route-details">
                      <div className="driver-load-address">{delivery.address}</div>
                      <div className="driver-load-address">{delivery.city ? `${delivery.city}, ` : ''}{delivery.state}</div>
                      <div className="driver-load-datetime">{formatDateTime(delivery.datetime)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Load Details */}
        <div className="driver-load-details-section">
          <h2 className="heading-md">Load Details</h2>
          
          <div className="driver-load-details">
            <div className="driver-load-detail-item">
              <div className="driver-load-detail-label">Load Type</div>
              <div className="driver-load-detail-value">{load.load_type}</div>
            </div>
            <div className="driver-load-detail-item">
              <div className="driver-load-detail-label">Rate</div>
              <div className="driver-load-detail-value driver-load-rate">${load.rate.toLocaleString()}</div>
            </div>
            {load.temperature && (
              <div className="driver-load-detail-item">
                <div className="driver-load-detail-label">Temperature</div>
                <div className="driver-load-detail-value">{load.temperature}°F</div>
              </div>
            )}
          </div>

          {load.notes && (
            <div className="driver-load-notes">
              <div className="driver-load-detail-label">Notes</div>
              <div className="driver-load-detail-value">{load.notes}</div>
            </div>
          )}
        </div>

        {/* Broker Information */}
        <div className="driver-load-details-section">
          <h2 className="heading-md">Broker Contact</h2>
          
          <div className="driver-broker-info">
            <div className="driver-broker-info-item">
              <div className="driver-load-detail-label">Broker Name</div>
              <div className="driver-load-detail-value">{load.broker_name}</div>
            </div>
            <div className="driver-broker-info-item">
              <div className="driver-load-detail-label">Phone</div>
              <div className="driver-load-detail-value">
                <a href={`tel:${load.broker_contact}`} className="text-primary">
                  {formatPhoneForDisplay(load.broker_contact)}
                </a>
              </div>
            </div>
            <div className="driver-broker-info-item">
              <div className="driver-load-detail-label">Email</div>
              <div className="driver-load-detail-value">
                <a href={`mailto:${load.broker_email}`} className="text-primary">
                  {load.broker_email}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Status Update */}
        <div className="driver-load-details-section">
          <h2 className="heading-md">Update Status</h2>
          
          <div className="driver-status-buttons">
            {load.status === 'Scheduled' && (
              <button
                onClick={() => updateLoadStatus('In-Transit')}
                className="btn-warning"
              >
                Mark In-Transit
              </button>
            )}
            {load.status === 'In-Transit' && (
              <button
                onClick={() => updateLoadStatus('Delivered')}
                className="btn-success"
              >
                Mark Delivered
              </button>
            )}
          </div>
        </div>

        {/* Document Upload */}
        <div className="driver-load-details-section">
          <h2 className="heading-md">Upload Documents</h2>
          
          <div className="driver-upload-section">
            <div className="driver-upload-item">
              <label className="label-text">
                Upload PDF Documents
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="driver-file-input"
              />
              <p className="text-hint">
                Select PDF files (max 10MB each)
              </p>
            </div>

            {uploading && (
              <div className="driver-upload-progress">
                <div className="driver-upload-progress-content">
                  <div className="spinner-sm"></div>
                  <span className="text-primary">Uploading document...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Documents */}
        <div className="driver-load-details-section">
          <h2 className="heading-md">
            Uploaded Documents ({documents.length})
          </h2>
          
          {documents.length === 0 ? (
            <div className="driver-documents-empty">
              <div className="driver-documents-empty-icon">📄</div>
              <div className="text-muted">No documents uploaded yet</div>
              <div className="text-hint">Upload PDFs using the form above</div>
            </div>
          ) : (
            <div className="driver-documents-list">
              {documents.map((doc) => (
                <div key={doc.id} className="driver-document-item">
                  <div className="driver-document-info">
                    <div className="driver-document-icon">📄</div>
                    <div className="driver-document-details">
                      <div className="driver-document-name">{doc.file_name}</div>
                      <div className="driver-document-date">
                        Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => viewDocument(doc)}
                    className="driver-document-view-btn"
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