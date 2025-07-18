'use client';

import { useState, useCallback } from 'react';
import { ExtractedLoadData } from '@/config/aiConfig';

interface AiPdfUploadProps {
  onDataExtracted: (data: ExtractedLoadData) => void;
  onError: (error: string) => void;
}

type ProcessingState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

export default function AiPdfUpload({ onDataExtracted, onError }: AiPdfUploadProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [fileName, setFileName] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setProcessingState('uploading');
      setFileName(file.name);

      // Validate file
      if (file.type !== 'application/pdf') {
        throw new Error('Please upload a PDF file');
      }

      if (file.size > 25 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 25MB');
      }

      setProcessingState('processing');

      // Send to AI extraction API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ai-extract-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to process PDF');
      }

      const result = await response.json();
      
      if (result.success) {
        setProcessingState('complete');
        onDataExtracted(result.data);
      } else {
        throw new Error(result.error || 'Failed to extract data');
      }

    } catch (error) {
      setProcessingState('error');
      onError((error as Error).message);
    }
  }, [onDataExtracted, onError]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const resetUpload = () => {
    setProcessingState('idle');
    setFileName('');
  };

  const getStatusMessage = () => {
    switch (processingState) {
      case 'uploading':
        return 'Uploading PDF...';
      case 'processing':
        return 'AI is analyzing document...';
      case 'complete':
        return 'Data extracted successfully!';
      case 'error':
        return 'Failed to process PDF';
      default:
        return 'Upload a PDF to auto-fill the form';
    }
  };

  const getStatusColor = () => {
    switch (processingState) {
      case 'complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'processing':
      case 'uploading':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="ai-pdf-upload mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          📄 Smart PDF Auto-Fill
        </h3>
        {processingState === 'complete' && (
          <button
            onClick={resetUpload}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Upload Another
          </button>
        )}
      </div>

      {processingState === 'idle' && (
        <div
          className={`upload-area border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-lg text-gray-600 mb-2">
            Drop your PDF here or click to browse
          </p>
          <p className="text-sm text-gray-500 mb-4">
            AI will extract load information and auto-fill the form
          </p>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            Choose PDF File
          </label>
        </div>
      )}

      {processingState !== 'idle' && (
        <div className="processing-status text-center">
          <div className="flex items-center justify-center mb-3">
            {(processingState === 'uploading' || processingState === 'processing') && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
            )}
            {processingState === 'complete' && (
              <div className="text-green-600 mr-2">✓</div>
            )}
            {processingState === 'error' && (
              <div className="text-red-600 mr-2">✗</div>
            )}
            <span className={`font-medium ${getStatusColor()}`}>
              {getStatusMessage()}
            </span>
          </div>
          
          {fileName && (
            <p className="text-sm text-gray-600 mb-2">
              File: {fileName}
            </p>
          )}
          
          {processingState === 'complete' && (
            <p className="text-sm text-green-600">
              Form has been auto-filled with extracted data. Review and modify as needed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}