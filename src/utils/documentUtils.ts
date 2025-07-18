import { SupabaseClient } from '@supabase/supabase-js';
import { LoadDocument } from '../types';

// Types for compression
export type CompressionLevel = 'low' | 'recommended' | 'extreme';

export interface CompressionResult {
  success: boolean;
  compressedFile?: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  error?: string;
}

// Configuration
const STORAGE_BUCKET = 'load-pdfs';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const SMALL_FILE_FALLBACK_SIZE = 200 * 1024; // 200KB - allow upload without compression for small files
const MAX_FILE_SIZE_WITH_COMPRESSION = 25 * 1024 * 1024; // 25MB - allow larger files if compression is enabled
const VERCEL_COMPRESSION_LIMIT = 4 * 1024 * 1024; // 4MB - Vercel serverless function limit
const ALLOWED_TYPES = ['application/pdf'];
// const COMPRESSION_THRESHOLD = 1024 * 1024; // 1MB - recommend compression for files larger than this (no longer used)

// Validate file before upload
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Only PDF files are allowed' };
  }
  
  // Allow larger files since compression is always enabled
  if (file.size > MAX_FILE_SIZE_WITH_COMPRESSION) {
    return { 
      isValid: false, 
      error: 'File size must be less than 25MB' 
    };
  }
  
  return { isValid: true };
};

// Helper function to detect if we're running on Vercel
const isRunningOnVercel = (): boolean => {
  return !!(
    process.env.VERCEL || 
    process.env.VERCEL_ENV || 
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL
  );
};

// Check if file should be compressed (skip for large files on Vercel)
export const shouldCompressFile = (file: File): boolean => {
  const isVercel = isRunningOnVercel();
  
  // Skip compression on Vercel for files larger than 4MB to avoid 413 errors
  if (isVercel && file.size > VERCEL_COMPRESSION_LIMIT) {
    return false;
  }
  
  return true; // Compress all other files
};

// Upload large file via Vercel Blob for background processing
export const uploadLargeFileViaBlob = async (
  file: File,
  loadId: string
): Promise<CompressionResult> => {
  try {
    const { upload } = await import('@vercel/blob/client');
    
    // Create a unique filename that includes loadId
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathname = `${loadId}/${timestamp}_${sanitizedName}`;
    
    await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/process-large-pdf',
      clientPayload: JSON.stringify({ loadId }),
    });
    
    return {
      success: true,
      originalSize: file.size,
      compressedSize: file.size, // Will be updated when processing completes
      compressionRatio: 0, // Will be updated when processing completes
    };
    
  } catch (error) {
    return {
      success: false,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0,
      error: error instanceof Error ? error.message : 'Large file upload failed'
    };
  }
};

// Compress PDF file using the API endpoint
export const compressPDFFile = async (
  file: File
): Promise<CompressionResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/compress-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 0,
        error: errorData.error || 'Compression failed'
      };
    }

    // Get compression statistics from headers
    const originalSize = parseInt(response.headers.get('X-Original-Size') || '0');
    const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0');
    const compressionRatio = parseFloat(response.headers.get('X-Compression-Ratio') || '0');

    // Get the compressed file blob
    const compressedBlob = await response.blob();
    
    // Create a new File object from the compressed blob
    const compressedFile = new File([compressedBlob], file.name, {
      type: 'application/pdf',
      lastModified: Date.now()
    });

    return {
      success: true,
      compressedFile,
      originalSize,
      compressedSize,
      compressionRatio
    };

  } catch (error) {
    return {
      success: false,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0,
      error: error instanceof Error ? error.message : 'Compression failed'
    };
  }
};

// Format compression statistics for display
export const formatCompressionStats = (result: CompressionResult): string => {
  if (!result.success) {
    return 'Compression failed';
  }
  
  const originalMB = (result.originalSize / (1024 * 1024)).toFixed(2);
  const compressedMB = (result.compressedSize / (1024 * 1024)).toFixed(2);
  const savings = result.compressionRatio;
  
  return `Compressed from ${originalMB}MB to ${compressedMB}MB (${savings}% reduction)`;
};

// Upload file to Supabase Storage
export const uploadDocument = async (
  supabase: SupabaseClient,
  loadId: string, 
  file: File,
  useOriginal: boolean = false,
  onProgress?: (phase: 'compressing' | 'uploading', progress: number) => void
): Promise<{ success: boolean; data?: LoadDocument; error?: string; compressionStats?: string; allowFallback?: boolean }> => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    let fileToUpload = file;
    let compressionStats = '';


    // Try to compress unless explicitly asked to use original
    if (!useOriginal && shouldCompressFile(file)) {
      onProgress?.('compressing', 10);
      const compressionResult = await compressPDFFile(file);
      onProgress?.('compressing', 40);
      
      if (compressionResult.success && compressionResult.compressedFile) {
        fileToUpload = compressionResult.compressedFile;
        compressionStats = formatCompressionStats(compressionResult);
        onProgress?.('compressing', 50);
        
        // Validate compressed file size
        if (fileToUpload.size > MAX_FILE_SIZE) {
          return { 
            success: false, 
            error: `Compressed file size (${(fileToUpload.size / (1024 * 1024)).toFixed(2)}MB) still exceeds 25MB limit. Try using 'extreme' compression level.` 
          };
        }
      } else {
        // If compression fails for small files (under 200KB), automatically proceed without compression
        if (file.size <= SMALL_FILE_FALLBACK_SIZE) {
          fileToUpload = file; // Use original file
          compressionStats = `Compression failed, uploaded without compression (${(file.size / 1024).toFixed(1)}KB)`;
          onProgress?.('compressing', 50);
        } else if (file.size <= MAX_FILE_SIZE) {
          // File is between 200KB and 25MB - compression failed, no fallback
          return { 
            success: false, 
            error: `Cannot upload file: ${compressionResult.error}. File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) requires compression but compression failed.` 
          };
        } else {
          // File is too large and compression failed
          return { 
            success: false, 
            error: `Cannot upload file: ${compressionResult.error}. File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds 25MB limit and compression is required.` 
          };
        }
      }
    } else if (!useOriginal && file.size > VERCEL_COMPRESSION_LIMIT) {
      // Large file - use Vercel Blob for background processing
      onProgress?.('compressing', 10);
      
      try {
        const blobResult = await uploadLargeFileViaBlob(file, loadId);
        onProgress?.('compressing', 100);
        
        if (blobResult.success) {
          // Return success immediately - the background processing will handle the database entry
          return {
            success: true,
            compressionStats: `Large file (${(file.size / (1024 * 1024)).toFixed(2)}MB) uploaded for background processing`
          };
        } else {
          return {
            success: false,
            error: `Large file upload failed: ${blobResult.error || 'Unknown error during blob upload'}`
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Large file upload exception: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
    
    onProgress?.('uploading', 60);

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `load_${loadId}/${fileName}`;

    // Upload to Supabase Storage
    onProgress?.('uploading', 70);
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, fileToUpload);

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }
    
    onProgress?.('uploading', 90);

    // Save metadata to database with file path (not full URL)
    const { data: dbData, error: dbError } = await supabase
      .from('load_documents')
      .insert([{
        load_id: loadId,
        file_name: file.name,
        file_url: filePath, // Store just the file path
      }])
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      return { success: false, error: dbError.message };
    }
    
    onProgress?.('uploading', 95);

    // Log document upload activity
    try {
      // Get load and driver information for the activity
      const { data: loadData } = await supabase
        .from('loads')
        .select('reference_id, driver_id, drivers!inner(name)')
        .eq('id', loadId)
        .single();

      if (loadData) {
        const driverName = (loadData as Record<string, unknown>).drivers && 
          typeof (loadData as Record<string, unknown>).drivers === 'object' &&
          (loadData as Record<string, unknown>).drivers !== null && 
          'name' in ((loadData as Record<string, unknown>).drivers as object) ? 
          (((loadData as Record<string, unknown>).drivers as Record<string, unknown>).name as string) : 
          'Unknown Driver';
        
        // Add document upload activity
        await supabase.rpc('add_document_upload_activity', {
          p_driver_name: driverName,
          p_load_reference_id: loadData.reference_id,
          p_file_name: file.name
        });
      }
    } catch (activityError) {
      console.error('Failed to log document upload activity:', activityError);
    }

    return { 
      success: true, 
      data: dbData as LoadDocument, 
      compressionStats: compressionStats || undefined 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
};

// Generate signed URL for private bucket access
export const getSignedUrl = async (
  supabase: SupabaseClient,
  filePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, url: data.signedUrl };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate signed URL' 
    };
  }
};

// Get all documents for a load
export const getLoadDocuments = async (
  supabase: SupabaseClient,
  loadId: string
): Promise<{ success: boolean; data?: LoadDocument[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('load_documents')
      .select('*')
      .eq('load_id', loadId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as LoadDocument[] };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch documents' 
    };
  }
};

// Delete a document
export const deleteDocument = async (
  supabase: SupabaseClient,
  documentId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First get the document to find the file path
    const { data: doc, error: fetchError } = await supabase
      .from('load_documents')
      .select('file_url')
      .eq('id', documentId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // file_url now contains the file path directly (not a full URL)
    const filePath = doc.file_url;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (storageError) {
      console.warn('Failed to delete from storage:', storageError.message);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('load_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete document' 
    };
  }
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 