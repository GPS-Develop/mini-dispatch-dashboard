import { supabase } from './supabaseClient';
import { LoadDocument } from '../types';

// Configuration
const STORAGE_BUCKET = 'load-pdfs';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf'];

// Validate file before upload
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Only PDF files are allowed' };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }
  
  return { isValid: true };
};

// Upload file to Supabase Storage
export const uploadDocument = async (
  loadId: string, 
  file: File
): Promise<{ success: boolean; data?: LoadDocument; error?: string }> => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `load_${loadId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file);

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    // Save metadata to database
    const { data: dbData, error: dbError } = await supabase
      .from('load_documents')
      .insert([{
        load_id: loadId,
        file_name: file.name,
        file_url: urlData.publicUrl,
      }])
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      return { success: false, error: dbError.message };
    }

    return { success: true, data: dbData as LoadDocument };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
};

// Get all documents for a load
export const getLoadDocuments = async (
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

    // Extract file path from URL
    const url = new URL(doc.file_url);
    const filePath = url.pathname.split('/').slice(-2).join('/'); // Get last two parts

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