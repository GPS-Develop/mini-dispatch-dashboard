"use client";
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchDocuments();
  }, [loadId]);

  const fetchDocuments = async () => {
    setLoading(true);
    const result = await getLoadDocuments(supabase, loadId);
    if (result.success && result.data) {
      setDocuments(result.data);
    } else {
      setError(result.error || 'Failed to fetch documents');
    }
    setLoading(false);
  };

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
    } catch (error) {
      setError('Failed to open document');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Documents - Load #{loadReferenceId}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Upload Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload PDF Documents
          </label>
          <input
            type="file"
            multiple
            accept=".pdf,application/pdf"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Select one or more PDF files (max 10MB each)
          </p>
        </div>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mb-4">
            {Object.entries(uploadProgress).map(([fileKey, progress]) => (
              <div key={fileKey} className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{fileKey.split('_')[0]}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm whitespace-pre-line">
            {error}
          </div>
        )}

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Uploaded Documents ({documents.length})
          </h3>
          
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No documents uploaded yet</p>
              <p className="text-sm">Upload PDFs using the file input above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(doc.uploaded_at).toLocaleDateString()} at{' '}
                        {new Date(doc.uploaded_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openDocument(doc.file_url)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
} 