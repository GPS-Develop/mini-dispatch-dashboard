"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { LoadDocument } from '../../types';
import { uploadDocument, getLoadDocuments, deleteDocument, getSignedUrl } from '../../utils/documentUtils';
import { createClient } from '../../utils/supabase/client';
import Button from '../Button/Button';

interface DocumentUploadModalProps {
  loadId: string;
  loadReferenceId: string;
  onClose: () => void;
}

export default function DocumentUploadModal({ loadId, loadReferenceId, onClose }: DocumentUploadModalProps) {
  const [documents, setDocuments] = useState<LoadDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [compressionStats, setCompressionStats] = useState<{ [key: string]: string }>({});
  const [failedFiles, setFailedFiles] = useState<{ [key: string]: { file: File; error: string } }>({});
  const [fileStatus, setFileStatus] = useState<{ [key: string]: 'compressing' | 'uploading' | 'completed' | 'failed' | 'processing' }>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ documentId: string; fileName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const result = await getLoadDocuments(supabase, loadId);
    if (result.success && result.data) {
      setDocuments(result.data);
    } else {
      setError(result.error || 'Failed to fetch documents');
    }
    setLoading(false);
  }, [supabase, loadId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for processing documents
  useEffect(() => {
    const hasProcessingDocs = documents.some(doc => doc.file_url === 'processing');
    
    if (hasProcessingDocs) {
      const pollInterval = setInterval(() => {
        fetchDocuments();
      }, 5000); // Poll every 5 seconds
      
      return () => clearInterval(pollInterval);
    }
  }, [documents, fetchDocuments]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileKey = `${file.name}_${Date.now()}`;
      
      try {
        setUploadProgress(prev => ({ ...prev, [fileKey]: 0 }));
        setFileStatus(prev => ({ ...prev, [fileKey]: 'compressing' }));
        
        // Quick client-side PDF validation
        if (file.type === 'application/pdf') {
          const buffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(buffer);
          const header = String.fromCharCode(...uint8Array.slice(0, 4));
          
          if (header !== '%PDF') {
            setError(prev => prev + (prev ? '\n' : '') + `${file.name}: Not a valid PDF file`);
            setFileStatus(prev => ({ ...prev, [fileKey]: 'failed' }));
            continue;
          }
        }
        
        const result = await uploadDocument(
          supabase, 
          loadId, 
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
          
          // For background processing, show processing status and refresh the document list multiple times
          if (result.compressionStats && result.compressionStats.includes('background processing')) {
            setFileStatus(prev => ({ ...prev, [fileKey]: 'processing' }));
            
            // Refresh multiple times to catch when processing completes
            const refreshTimes = [3000, 6000, 10000, 15000]; // 3s, 6s, 10s, 15s
            refreshTimes.forEach(delay => {
              setTimeout(() => {
                fetchDocuments();
              }, delay);
            });
          }
        } else {
          setFileStatus(prev => ({ ...prev, [fileKey]: 'failed' }));
          // Check if fallback is allowed
          if (result.allowFallback) {
            setFailedFiles(prev => ({ ...prev, [fileKey]: { file, error: result.error! } }));
          } else {
            setError(prev => prev + (prev ? '\n' : '') + `${file.name}: ${result.error || 'Upload failed with unknown error'}`);
          }
        }
             } catch {
         setError(prev => prev + (prev ? '\n' : '') + `${file.name}: Upload failed`);
         setFileStatus(prev => ({ ...prev, [fileKey]: 'failed' }));
       }
      
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
      }, timeoutDelay); // Show background processing stats longer
    }

    setUploading(false);
    // Clear the input
    event.target.value = '';
  };

  const handleUploadOriginal = async (fileKey: string) => {
    const failedFile = failedFiles[fileKey];
    if (!failedFile) return;

    try {
      setUploading(true);
      setUploadProgress(prev => ({ ...prev, [fileKey]: 0 }));
      
      const result = await uploadDocument(
        supabase, 
        loadId, 
        failedFile.file, 
        true, 
        (phase, progress) => {
          setFileStatus(prev => ({ ...prev, [fileKey]: phase }));
          setUploadProgress(prev => ({ ...prev, [fileKey]: progress }));
        }
      );
      
      if (result.success && result.data) {
        setDocuments(prev => [result.data!, ...prev]);
        setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }));
        setFileStatus(prev => ({ ...prev, [fileKey]: 'completed' }));
        setFailedFiles(prev => {
          const newFailedFiles = { ...prev };
          delete newFailedFiles[fileKey];
          return newFailedFiles;
        });
        
        // Add note about no compression
        setCompressionStats(prev => ({ ...prev, [fileKey]: 'Uploaded without compression' }));
      } else {
        setFileStatus(prev => ({ ...prev, [fileKey]: 'failed' }));
        setError(prev => prev + (prev ? '\n' : '') + `${failedFile.file.name}: ${result.error}`);
      }
    } catch {
      setFileStatus(prev => ({ ...prev, [fileKey]: 'failed' }));
      setError(prev => prev + (prev ? '\n' : '') + `${failedFile.file.name}: Upload failed`);
    } finally {
      setUploading(false);
      
      // Remove progress after delay
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
      }, 5000);
    }
  };

  const handleDeleteDocument = (documentId: string, fileName: string) => {
    setDeleteConfirmation({ documentId, fileName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    setDeleting(true);
    const result = await deleteDocument(supabase, deleteConfirmation.documentId);
    
    if (result.success) {
      setDocuments(prev => prev.filter(doc => doc.id !== deleteConfirmation.documentId));
      setDeleteConfirmation(null);
    } else {
      setError(result.error || 'Failed to delete document');
    }
    setDeleting(false);
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const openDocument = async (filePath: string) => {
    try {
      const result = await getSignedUrl(supabase, filePath);
      if (result.success && result.url) {
        window.open(result.url, '_blank');
      } else {
        setError(result.error || 'Failed to open document');
      }
    } catch {
      setError('Failed to open document');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="heading-lg">
            Documents - Load #{loadReferenceId}
          </h2>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Upload Section */}
        <div className="modal-body">
          <div className="edit-form-section">
            <label className="label-text">
              Upload PDF Documents
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,application/pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="input-field"
            />
            <p className="text-hint">
              Select one or more PDF files (max 25MB each)
            </p>
            <p className="text-hint text-hint-small text-success">
              Files under 4MB will be automatically compressed. Larger files will be processed in the background.
            </p>
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="edit-form-section">
              {Object.entries(uploadProgress).map(([fileKey, progress]) => {
                const status = fileStatus[fileKey];
                const getStatusText = () => {
                  switch (status) {
                    case 'compressing': return 'Compressing...';
                    case 'uploading': return 'Uploading...';
                    case 'processing': return 'Processing in background...';
                    case 'completed': return 'Completed';
                    case 'failed': return 'Failed';
                    default: return `${progress}%`;
                  }
                };
                
                const getProgressValue = () => {
                  switch (status) {
                    case 'compressing': return Math.max(progress, 10); // Show actual compression progress
                    case 'uploading': return Math.max(progress, 60); // Show actual upload progress
                    case 'processing': return 100; // Show complete for background processing
                    case 'completed': return 100;
                    case 'failed': return 0;
                    default: return progress;
                  }
                };
                
                return (
                  <div key={fileKey} className="document-upload-progress">
                    <div className="document-upload-progress-header">
                      <span className="text-muted">{fileKey.split('_')[0]}</span>
                      <span className="text-muted">{getStatusText()}</span>
                    </div>
                    <div className="progress-container">
                      <div
                        className={`progress-bar ${status ? `progress-bar-${status}` : ''}`}
                        style={{ '--progress-width': `${getProgressValue()}%` } as React.CSSProperties}
                      ></div>
                    </div>
                    {compressionStats[fileKey] && (
                      <div className="compression-stats">
                        {compressionStats[fileKey]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Failed Files with Fallback Option */}
          {Object.keys(failedFiles).length > 0 && (
            <div className="failed-files-section">
              <h4 className="heading-sm failed-files-heading">
                Compression Failed
              </h4>
              {Object.entries(failedFiles).map(([fileKey, { file, error }]) => (
                <div key={fileKey} className="failed-file-item">
                  <div className="failed-file-header">
                    <span className="text-muted failed-file-name">{file.name}</span>
                    <span className="text-muted failed-file-size">
                      {(file.size / (1024 * 1024)).toFixed(2)}MB
                    </span>
                  </div>
                  <div className="failed-file-error">
                    {error}
                  </div>
                  <div className="failed-file-actions">
                    <button
                      onClick={() => handleUploadOriginal(fileKey)}
                      disabled={uploading}
                      className="failed-file-btn failed-file-btn-upload"
                    >
                      Upload Without Compression
                    </button>
                    <button
                      onClick={() => setFailedFiles(prev => {
                        const newFailedFiles = { ...prev };
                        delete newFailedFiles[fileKey];
                        return newFailedFiles;
                      })}
                      className="failed-file-btn failed-file-btn-cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="alert-error">
              <p className="error-text-multiline">{error}</p>
            </div>
          )}

          {/* Documents List */}
          <div className="document-list-section">
            <h3 className="heading-md">
              Uploaded Documents ({documents.length})
            </h3>
            
            {loading ? (
              <div className="loading-container">
                <div className="text-muted">Loading documents...</div>
              </div>
            ) : documents.length === 0 ? (
              <div className="document-empty-state">
                <svg className="document-empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-muted">No documents uploaded yet</p>
                <p className="text-hint">Upload PDFs using the file input above</p>
              </div>
            ) : (
              <div className="document-list">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="document-item"
                  >
                    <div className="document-item-content">
                      <div className="document-item-icon">
                        <svg className="document-pdf-icon" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="document-item-info">
                        <p className="document-item-name">
                          {doc.file_name}
                          {doc.file_url === 'processing' && (
                            <span className="document-status document-status-processing">
                              (Processing...)
                            </span>
                          )}
                          {doc.file_url.startsWith('failed:') && (
                            <span className="document-status document-status-failed">
                              (Failed)
                            </span>
                          )}
                        </p>
                        <p className="document-item-date">
                          {new Date(doc.uploaded_at).toLocaleDateString()} at{' '}
                          {new Date(doc.uploaded_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="document-item-actions">
                      <button
                        onClick={() => openDocument(doc.file_url)}
                        className="document-action-view"
                        disabled={doc.file_url === 'processing' || doc.file_url.startsWith('failed:')}
                        title={doc.file_url === 'processing' ? 'Document is still processing' : doc.file_url.startsWith('failed:') ? 'Document processing failed' : ''}
                      >
                        View
                      </button>
                      {doc.file_url === 'processing' ? (
                        <button
                          onClick={() => fetchDocuments()}
                          className="document-action-view"
                          title="Refresh to check processing status"
                        >
                          Refresh
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.file_name)}
                          className="document-action-delete"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="heading-md">Delete Document</h3>
              <button
                onClick={cancelDelete}
                className="modal-close-btn"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-confirmation-content">
                <div className="delete-confirmation-icon">
                  <svg className="delete-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="delete-confirmation-text">
                  <p className="delete-confirmation-message">
                    Are you sure you want to delete this document?
                  </p>
                  <p className="delete-confirmation-filename">
                    {deleteConfirmation.fileName}
                  </p>
                  <p className="delete-confirmation-warning">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <Button
                variant="secondary"
                onClick={cancelDelete}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 