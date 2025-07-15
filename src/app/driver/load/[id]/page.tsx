'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { formatPhoneForDisplay } from '@/utils/validation';
import { uploadDocument, getLoadDocuments, getSignedUrl } from '@/utils/documentUtils';
import { LumperService, LumperServiceForm } from '@/types';

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
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  datetime: string;
}

interface Delivery {
  id: string;
  load_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
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
  const [lumperService, setLumperService] = useState<LumperService | null>(null);
  const [lumperForm, setLumperForm] = useState<LumperServiceForm>({
    no_lumper: false,
    paid_by_broker: false,
    paid_by_company: false,
    paid_by_driver: false,
    broker_amount: '',
    company_amount: '',
    driver_amount: '',
    driver_payment_reason: ''
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingLumper, setSavingLumper] = useState(false);
  const [error, setError] = useState<string>('');
  const lumperSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [compressionStats, setCompressionStats] = useState<{ [key: string]: string }>({});
  const [fileStatus, setFileStatus] = useState<{ [key: string]: 'compressing' | 'uploading' | 'completed' | 'failed' | 'processing' }>({});

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
        // Handle pickup fetch error silently - pickups will remain empty
      } else {
        setPickups(pickupsData || []);
      }

      // Fetch deliveries for this load
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('load_id', params.id);

      if (deliveriesError) {
        // Handle delivery fetch error silently - deliveries will remain empty
      } else {
        setDeliveries(deliveriesData || []);
      }

      // Fetch documents for this load using the existing utility
      const documentsResult = await getLoadDocuments(supabase, params.id as string);
      if (documentsResult.success && documentsResult.data) {
        setDocuments(documentsResult.data);
      } else {
        // Handle document fetch error silently - documents will remain empty
      }

      // Fetch lumper service for this load
      const { data: lumperData, error: lumperError } = await supabase
        .from('lumper_services')
        .select('*')
        .eq('load_id', params.id)
        .single();

      if (lumperError) {
        // No lumper service exists yet - that's fine
        setLumperService(null);
      } else {
        setLumperService(lumperData);
        // Populate form with existing data
        setLumperForm({
          no_lumper: lumperData.no_lumper || false,
          paid_by_broker: lumperData.paid_by_broker,
          paid_by_company: lumperData.paid_by_company,
          paid_by_driver: lumperData.paid_by_driver,
          broker_amount: lumperData.broker_amount?.toString() || '',
          company_amount: lumperData.company_amount?.toString() || '',
          driver_amount: lumperData.driver_amount?.toString() || '',
          driver_payment_reason: lumperData.driver_payment_reason || ''
        });
      }
    } catch {
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

  // Removed auto-polling - drivers can manually refresh using the refresh button

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !load) return;

    const file = files[0];
    const fileKey = `${file.name}_${Date.now()}`;
    
    try {
      setUploading(true);
      setError('');
      setUploadProgress(prev => ({ ...prev, [fileKey]: 0 }));
      setFileStatus(prev => ({ ...prev, [fileKey]: 'compressing' }));

      // Use the existing upload utility with progress tracking
      const result = await uploadDocument(
        supabase, 
        load.id, 
        file,
        false,
        (phase, progress) => {
          setFileStatus(prev => ({ ...prev, [fileKey]: phase }));
          setUploadProgress(prev => ({ ...prev, [fileKey]: progress }));
        }
      );
      
      if (result.success) {
        setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }));
        setFileStatus(prev => ({ ...prev, [fileKey]: 'completed' }));
        
        // For regular uploads with immediate database entry
        if (result.data) {
          setDocuments(prev => [result.data!, ...prev]);
        }
        
        // Store compression stats if available
        if (result.compressionStats) {
          setCompressionStats(prev => ({ ...prev, [fileKey]: result.compressionStats! }));
        }
        
        // For background processing, show processing status (no auto-refresh)
        if (result.compressionStats && result.compressionStats.includes('background processing')) {
          setFileStatus(prev => ({ ...prev, [fileKey]: 'processing' }));
          // Note: Driver can manually refresh to check processing status
        }
      } else {
        setFileStatus(prev => ({ ...prev, [fileKey]: 'failed' }));
        setError(result.error || 'Failed to upload document');
      }
      
      // Clear file input
      event.target.value = '';
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      setFileStatus(prev => ({ ...prev, [fileKey]: 'failed' }));
    } finally {
      setUploading(false);
      
      // Remove progress and compression stats after a delay
      const timeoutDelay = compressionStats[fileKey]?.includes('background processing') ? 8000 : 5000;
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileKey];
          return newProgress;
        });
        setCompressionStats(prev => {
          const newStats = { ...prev };
          delete newStats[fileKey];
          return newStats;
        });
        setFileStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[fileKey];
          return newStatus;
        });
      }, timeoutDelay);
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
    } catch {
      setError('Failed to open document');
    }
  };

  const updateLoadStatus = async (newStatus: "Scheduled" | "In-Transit" | "Delivered") => {
    if (!load) return;

    // Validation for marking as delivered
    if (newStatus === "Delivered") {
      const validationErrors = [];

      // Check if lumper service is filled
      const hasLumperService = lumperService || 
        (lumperForm.no_lumper || lumperForm.paid_by_broker || lumperForm.paid_by_company || lumperForm.paid_by_driver);
      
      if (!hasLumperService) {
        validationErrors.push("Lumper service information is required");
      }

      // Check if at least one document is uploaded
      if (documents.length === 0) {
        validationErrors.push("At least one document must be uploaded");
      }

      // Show validation errors if any
      if (validationErrors.length > 0) {
        setError(validationErrors.join(". "));
        return;
      }
    }

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
        } catch {
          // Activity logging failed silently - status update still succeeded
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update load status';
      setError(errorMessage);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (lumperSaveTimeoutRef.current) {
        clearTimeout(lumperSaveTimeoutRef.current);
      }
    };
  }, []);

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

  const handleLumperCheckboxChange = async (field: keyof Pick<LumperServiceForm, 'no_lumper' | 'paid_by_broker' | 'paid_by_company' | 'paid_by_driver'>) => {
    const newForm = { ...lumperForm, [field]: !lumperForm[field] };
    
    // If "No Lumper" is selected, uncheck all other options
    if (field === 'no_lumper' && newForm.no_lumper) {
      newForm.paid_by_broker = false;
      newForm.paid_by_company = false;
      newForm.paid_by_driver = false;
      newForm.broker_amount = '';
      newForm.company_amount = '';
      newForm.driver_amount = '';
      newForm.driver_payment_reason = '';
    } 
    // If any payment option is selected, uncheck "No Lumper"
    else if (field !== 'no_lumper' && newForm[field]) {
      newForm.no_lumper = false;
    }
    
    setLumperForm(newForm);
    
    // Auto-save immediately for checkboxes
    await autoSaveLumperService(newForm);
  };

  const handleLumperInputChange = (field: keyof LumperServiceForm, value: string) => {
    const newForm = {
      ...lumperForm,
      [field]: value
    };
    setLumperForm(newForm);
    
    // Debounce auto-save for input fields (save after 1 second of inactivity)
    if (lumperSaveTimeoutRef.current) {
      clearTimeout(lumperSaveTimeoutRef.current);
    }
    lumperSaveTimeoutRef.current = setTimeout(() => {
      autoSaveLumperService(newForm);
    }, 1000);
  };

  const autoSaveLumperService = async (formData: LumperServiceForm) => {
    if (!load) return;

    try {
      setSavingLumper(true);

      // Prepare data for saving
      const lumperData = {
        load_id: load.id,
        no_lumper: formData.no_lumper,
        paid_by_broker: formData.paid_by_broker,
        paid_by_company: formData.paid_by_company,
        paid_by_driver: formData.paid_by_driver,
        broker_amount: formData.paid_by_broker && formData.broker_amount ? parseFloat(formData.broker_amount) : null,
        company_amount: formData.paid_by_company && formData.company_amount ? parseFloat(formData.company_amount) : null,
        driver_amount: formData.paid_by_driver && formData.driver_amount ? parseFloat(formData.driver_amount) : null,
        driver_payment_reason: formData.paid_by_driver && formData.driver_payment_reason ? formData.driver_payment_reason : null
      };

      if (lumperService) {
        // Update existing record
        const { data, error } = await supabase
          .from('lumper_services')
          .update(lumperData)
          .eq('id', lumperService.id)
          .select()
          .single();

        if (error) throw error;
        setLumperService(data);
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('lumper_services')
          .insert(lumperData)
          .select()
          .single();

        if (error) throw error;
        setLumperService(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save lumper service';
      setError(errorMessage);
    } finally {
      setSavingLumper(false);
    }
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
                      <div className="driver-load-location-name">{pickup.name}</div>
                      <div className="driver-load-address">{pickup.address}</div>
                      <div className="driver-load-address">{pickup.city ? `${pickup.city}, ` : ''}{pickup.state} {pickup.postal_code}</div>
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
                      <div className="driver-load-location-name">{delivery.name}</div>
                      <div className="driver-load-address">{delivery.address}</div>
                      <div className="driver-load-address">{delivery.city ? `${delivery.city}, ` : ''}{delivery.state} {delivery.postal_code}</div>
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

        {/* Lumper Service */}
        <div className="driver-load-details-section">
          <div className="driver-section-header">
            <h2 className="heading-md">Lumper Service</h2>
            {savingLumper && (
              <div className="driver-auto-save-indicator">
                <span className="driver-save-spinner">⟳</span>
                <span className="driver-save-text">Saving...</span>
              </div>
            )}
          </div>
          
          {load.status === 'Delivered' && (
            <div className="driver-section-disabled-notice">
              <span className="driver-disabled-icon">🔒</span>
              <span className="driver-disabled-text">Load is delivered - lumper service cannot be modified</span>
            </div>
          )}
          
          <div className={`driver-lumper-form ${load.status === 'Delivered' ? 'disabled' : ''}`}>
            <div className="driver-lumper-checkboxes">
              <div className="driver-lumper-checkbox-item">
                <label className="driver-checkbox-label">
                  <input
                    type="checkbox"
                    checked={lumperForm.no_lumper}
                    onChange={() => load.status !== 'Delivered' && handleLumperCheckboxChange('no_lumper')}
                    disabled={load.status === 'Delivered'}
                    className="driver-checkbox"
                  />
                  <span className="driver-checkbox-text">No Lumper</span>
                </label>
              </div>

              <div className="driver-lumper-checkbox-item">
                <label className="driver-checkbox-label">
                  <input
                    type="checkbox"
                    checked={lumperForm.paid_by_broker}
                    onChange={() => load.status !== 'Delivered' && handleLumperCheckboxChange('paid_by_broker')}
                    disabled={load.status === 'Delivered'}
                    className="driver-checkbox"
                  />
                  <span className="driver-checkbox-text">Paid by Broker</span>
                </label>
                {lumperForm.paid_by_broker && (
                  <input
                    type="number"
                    placeholder="Amount"
                    value={lumperForm.broker_amount}
                    onChange={(e) => load.status !== 'Delivered' && handleLumperInputChange('broker_amount', e.target.value)}
                    disabled={load.status === 'Delivered'}
                    className="input-field driver-lumper-amount-input"
                    step="0.01"
                    min="0"
                  />
                )}
              </div>

              <div className="driver-lumper-checkbox-item">
                <label className="driver-checkbox-label">
                  <input
                    type="checkbox"
                    checked={lumperForm.paid_by_company}
                    onChange={() => load.status !== 'Delivered' && handleLumperCheckboxChange('paid_by_company')}
                    disabled={load.status === 'Delivered'}
                    className="driver-checkbox"
                  />
                  <span className="driver-checkbox-text">Paid by Company</span>
                </label>
                {lumperForm.paid_by_company && (
                  <input
                    type="number"
                    placeholder="Amount"
                    value={lumperForm.company_amount}
                    onChange={(e) => load.status !== 'Delivered' && handleLumperInputChange('company_amount', e.target.value)}
                    disabled={load.status === 'Delivered'}
                    className="input-field driver-lumper-amount-input"
                    step="0.01"
                    min="0"
                  />
                )}
              </div>

              <div className="driver-lumper-checkbox-item">
                <label className="driver-checkbox-label">
                  <input
                    type="checkbox"
                    checked={lumperForm.paid_by_driver}
                    onChange={() => load.status !== 'Delivered' && handleLumperCheckboxChange('paid_by_driver')}
                    disabled={load.status === 'Delivered'}
                    className="driver-checkbox"
                  />
                  <span className="driver-checkbox-text">Paid by Driver</span>
                </label>
                {lumperForm.paid_by_driver && (
                  <div className="driver-lumper-driver-fields">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={lumperForm.driver_amount}
                      onChange={(e) => load.status !== 'Delivered' && handleLumperInputChange('driver_amount', e.target.value)}
                      disabled={load.status === 'Delivered'}
                      className="input-field driver-lumper-amount-input"
                      step="0.01"
                      min="0"
                    />
                    <textarea
                      placeholder="Reason for payment"
                      value={lumperForm.driver_payment_reason}
                      onChange={(e) => load.status !== 'Delivered' && handleLumperInputChange('driver_payment_reason', e.target.value)}
                      disabled={load.status === 'Delivered'}
                      className="input-field driver-lumper-reason-input"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Status Update */}
        <div className="driver-load-details-section">
          <h2 className="heading-md">Update Status</h2>
          
          {load.status === 'In-Transit' && (
            <div className="driver-delivery-requirements">
              <h3 className="heading-sm">Requirements to Mark as Delivered:</h3>
              <div className="driver-requirements-checklist">
                <div className={`driver-requirement-item ${
                  (lumperService || lumperForm.no_lumper || lumperForm.paid_by_broker || lumperForm.paid_by_company || lumperForm.paid_by_driver) 
                    ? 'completed' : 'incomplete'
                }`}>
                  <span className="driver-requirement-icon">
                    {(lumperService || lumperForm.no_lumper || lumperForm.paid_by_broker || lumperForm.paid_by_company || lumperForm.paid_by_driver) ? '✅' : '❌'}
                  </span>
                  <span className="driver-requirement-text">Lumper service information</span>
                </div>
                <div className={`driver-requirement-item ${documents.length > 0 ? 'completed' : 'incomplete'}`}>
                  <span className="driver-requirement-icon">
                    {documents.length > 0 ? '✅' : '❌'}
                  </span>
                  <span className="driver-requirement-text">Document upload ({documents.length} uploaded)</span>
                </div>
              </div>
            </div>
          )}
          
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
                disabled={
                  !(lumperService || lumperForm.no_lumper || lumperForm.paid_by_broker || lumperForm.paid_by_company || lumperForm.paid_by_driver) ||
                  documents.length === 0
                }
              >
                Mark Delivered
              </button>
            )}
          </div>
        </div>

        {/* Document Upload */}
        <div className="driver-load-details-section">
          <h2 className="heading-md">Upload Documents</h2>
          
          {load.status === 'Delivered' && (
            <div className="driver-section-disabled-notice">
              <span className="driver-disabled-icon">🔒</span>
              <span className="driver-disabled-text">Load is delivered - documents cannot be modified</span>
            </div>
          )}
          
          <div className={`driver-upload-section ${load.status === 'Delivered' ? 'disabled' : ''}`}>
            {load.status !== 'Delivered' && (
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
                  Select PDF files (max 25MB each)
                </p>
                <p className="text-hint text-hint-small text-success">
                  Large files will be compressed.
                </p>
              </div>
            )}

            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="driver-upload-progress-section">
                {Object.entries(uploadProgress).map(([fileKey, progress]) => {
                  const status = fileStatus[fileKey];
                  const getStatusText = () => {
                    switch (status) {
                      case 'compressing': return 'Compressing...';
                      case 'uploading': return 'Uploading...';
                      case 'processing': return 'Processing in background - use refresh button to check';
                      case 'completed': return 'Completed';
                      case 'failed': return 'Failed';
                      default: return `${progress}%`;
                    }
                  };
                  
                  const getProgressValue = () => {
                    switch (status) {
                      case 'compressing': return Math.max(progress, 10);
                      case 'uploading': return Math.max(progress, 60);
                      case 'processing': return 100;
                      case 'completed': return 100;
                      case 'failed': return 0;
                      default: return progress;
                    }
                  };
                  
                  return (
                    <div key={fileKey} className="driver-upload-progress-item">
                      <div className="driver-upload-progress-header">
                        <span className="text-muted">{fileKey.split('_')[0]}</span>
                        <span className="text-muted">{getStatusText()}</span>
                      </div>
                      <div className="driver-progress-container">
                        <div
                          className={`driver-progress-bar ${status ? `driver-progress-bar-${status}` : ''}`}
                          style={{ '--progress-width': `${getProgressValue()}%` } as React.CSSProperties}
                        ></div>
                      </div>
                      {compressionStats[fileKey] && (
                        <div className="driver-compression-stats">
                          {compressionStats[fileKey]}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                      <div className="driver-document-name">
                        {doc.file_name}
                        {doc.file_url === 'processing' && (
                          <span className="driver-document-status driver-document-status-processing">
                            (Processing...)
                          </span>
                        )}
                        {doc.file_url.startsWith('failed:') && (
                          <span className="driver-document-status driver-document-status-failed">
                            (Failed)
                          </span>
                        )}
                      </div>
                      <div className="driver-document-date">
                        Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {doc.file_url === 'processing' ? (
                    <button
                      onClick={() => fetchLoadDetails()}
                      className="driver-document-view-btn"
                      title="Refresh to check processing status"
                    >
                      Refresh
                    </button>
                  ) : (
                    <button
                      onClick={() => viewDocument(doc)}
                      className="driver-document-view-btn"
                      disabled={doc.file_url.startsWith('failed:')}
                      title={doc.file_url.startsWith('failed:') ? 'Document processing failed' : ''}
                    >
                      View
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 