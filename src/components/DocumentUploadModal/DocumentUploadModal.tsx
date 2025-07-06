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
        
        const result = await uploadDocument(supabase, loadId, file);
        
        if (result.success && result.data) {
          setDocuments(prev => [result.data!, ...prev]);
          setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }));
        } else {
          setError(prev => prev + (prev ? '\n' : '') + `${file.name}: ${result.error}`);
        }
             } catch {
         setError(prev => prev + (prev ? '\n' : '') + `${file.name}: Upload failed`);
       }
      
      // Remove progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileKey];
          return newProgress;
        });
      }, 2000);
    }

    setUploading(false);
    // Clear the input
    event.target.value = '';
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const result = await deleteDocument(supabase, documentId);
    if (result.success) {
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } else {
      setError(result.error || 'Failed to delete document');
    }
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
    <div className="modal-overlay">
      <div className="modal-content-lg">
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
              Select one or more PDF files (max 10MB each)
            </p>
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="edit-form-section">
              {Object.entries(uploadProgress).map(([fileKey, progress]) => (
                <div key={fileKey} className="document-upload-progress">
                  <div className="document-upload-progress-header">
                    <span className="text-muted">{fileKey.split('_')[0]}</span>
                    <span className="text-muted">{progress}%</span>
                  </div>
                  <div className="progress-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="alert-error">
              <p style={{ whiteSpace: 'pre-line' }}>{error}</p>
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
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="document-action-delete"
                      >
                        Delete
                      </button>
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
    </div>
  );
} 