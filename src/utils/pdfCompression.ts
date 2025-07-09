import ILovePDFApi from '@ilovepdf/ilovepdf-nodejs';
import ILovePDFFile from '@ilovepdf/ilovepdf-nodejs/ILovePDFFile';
import fs from 'fs';
import path from 'path';

// PDF validation function
function validatePDF(buffer: Buffer): { isValid: boolean; error?: string } {
  // Check minimum size (PDF files should be at least a few hundred bytes)
  if (buffer.length < 200) {
    return { isValid: false, error: 'PDF file appears to be too small or corrupted' };
  }

  // Check PDF header
  const header = buffer.subarray(0, 4).toString();
  if (header !== '%PDF') {
    return { isValid: false, error: 'File is not a valid PDF (missing PDF header)' };
  }

  // Check for PDF version
  const versionMatch = buffer.subarray(0, 10).toString().match(/%PDF-(\d+\.\d+)/);
  if (!versionMatch) {
    return { isValid: false, error: 'Invalid PDF version header' };
  }

  const version = parseFloat(versionMatch[1]);
  if (version < 1.0 || version > 2.0) {
    return { isValid: false, error: `Unsupported PDF version: ${version}` };
  }

  // Check for EOF marker (should be near the end)
  const lastKB = buffer.subarray(-1024).toString();
  if (!lastKB.includes('%%EOF')) {
    return { isValid: false, error: 'PDF file appears to be incomplete (missing EOF marker)' };
  }

  // Check for essential PDF structures
  const pdfString = buffer.toString();
  if (!pdfString.includes('xref') || !pdfString.includes('trailer')) {
    return { isValid: false, error: 'PDF file is missing essential structures' };
  }

  return { isValid: true };
}

// Types for compression levels
export type CompressionLevel = 'low' | 'recommended' | 'extreme';

export interface CompressionResult {
  success: boolean;
  compressedBuffer?: Buffer;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

// Initialize iLoveAPI instance
const getILovePDFApi = () => {
  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
  const secretKey = process.env.ILOVEPDF_SECRET_KEY;
  
  if (!publicKey || !secretKey) {
    throw new Error('iLoveAPI credentials not configured. Please set ILOVEPDF_PUBLIC_KEY and ILOVEPDF_SECRET_KEY in your environment variables.');
  }
  
  return new ILovePDFApi(publicKey, secretKey);
};

/**
 * Compress a PDF file buffer using iLoveAPI
 * @param fileBuffer - The PDF file buffer to compress
 * @param fileName - Original filename (for temporary file operations)
 * @returns Promise with compression result
 */
export const compressPDFBuffer = async (
  fileBuffer: Buffer,
  fileName: string
): Promise<CompressionResult> => {
  let tempInputPath: string | null = null;
  const tempOutputPath: string | null = null;
  
  try {
    // Validate input
    if (!fileBuffer || fileBuffer.length === 0) {
      return {
        success: false,
        error: 'Invalid file buffer provided'
      };
    }

    // Enhanced PDF validation
    const validationResult = validatePDF(fileBuffer);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.error || 'Invalid PDF file'
      };
    }

    // Check file size limits for iLoveAPI (usually 100MB max)
    const maxApiFileSize = 100 * 1024 * 1024; // 100MB
    if (fileBuffer.length > maxApiFileSize) {
      return {
        success: false,
        error: 'File too large for compression service (max 100MB)'
      };
    }

    // Initialize iLoveAPI
    const ilovepdf = getILovePDFApi();
    
    // Create temporary directory for processing (use /tmp on Vercel)
    const tempDir = process.env.VERCEL 
      ? path.join('/tmp', 'pdf-compression')
      : path.join(process.cwd(), 'temp', 'pdf-compression');
    
    console.log('Creating temp directory:', tempDir);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('Temp directory created successfully');
    }
    
    // Create temporary input file with sanitized name
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempFileName = `${timestamp}_${sanitizedFileName}`;
    tempInputPath = path.join(tempDir, tempFileName);
    
    // Write buffer to temporary file
    fs.writeFileSync(tempInputPath, fileBuffer);
    
    // Verify file was written correctly
    const writtenFileSize = fs.statSync(tempInputPath).size;
    if (writtenFileSize !== fileBuffer.length) {
      throw new Error(`File write error: expected ${fileBuffer.length} bytes, got ${writtenFileSize} bytes`);
    }
    
    // Check file permissions
    try {
      fs.accessSync(tempInputPath, fs.constants.R_OK);
    } catch {
      throw new Error('Temporary file is not readable');
    }
    
    // Get original file size
    const originalSize = fileBuffer.length;
    
    // Create compress task
    const compressTask = ilovepdf.newTask('compress');
    
    // Set compression level (always use recommended)
    const compressionLevel = 'recommended';
    
    // Follow the exact workflow from the documentation
    await compressTask.start();
    
    // Create ILovePDFFile instance and add to task
    const ilovePDFFile = new ILovePDFFile(tempInputPath);
    await compressTask.addFile(ilovePDFFile);
    
    // Process the task with compression level
    await compressTask.process({ compression_level: compressionLevel });
    
    // Download compressed file
    const compressedData = await compressTask.download();
    
    // Convert to Buffer if needed
    const compressedBuffer = Buffer.isBuffer(compressedData) 
      ? compressedData 
      : Buffer.from(compressedData);
    
    // Calculate compression statistics
    const compressedSize = compressedBuffer.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
    
    return {
      success: true,
      compressedBuffer,
      originalSize,
      compressedSize,
      compressionRatio: Math.round(compressionRatio * 100) / 100 // Round to 2 decimal places
    };
    
  } catch (error) {
    let errorMessage = 'Unknown compression error';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error conditions
      if (error.message.includes('Request failed with status code 400')) {
        // Check if it's the specific upload error we're seeing
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
          const apiMessage = axiosError.response?.data?.error?.message;
          
          if (apiMessage === "Request can't be processed successfully") {
            errorMessage = 'PDF compression service cannot process this file. The file may be password-protected, corrupted, or in an unsupported format.';
          } else {
            errorMessage = 'PDF file may be corrupted or in an unsupported format';
          }
        } else {
          errorMessage = 'PDF file may be corrupted or in an unsupported format';
        }
      } else if (error.message.includes('Request failed with status code 401')) {
        errorMessage = 'Invalid API credentials';
      } else if (error.message.includes('Request failed with status code 403')) {
        errorMessage = 'API access forbidden - check your subscription';
      } else if (error.message.includes('Request failed with status code 413')) {
        errorMessage = 'File too large for compression service';
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  } finally {
    // Clean up temporary files
    if (tempInputPath && fs.existsSync(tempInputPath)) {
      try {
        fs.unlinkSync(tempInputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    
    if (tempOutputPath && fs.existsSync(tempOutputPath)) {
      try {
        fs.unlinkSync(tempOutputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
};

/**
 * Compress a PDF file using iLoveAPI
 * @param file - The File object to compress
 * @returns Promise with compression result
 */
export const compressPDFFile = async (
  file: File
): Promise<CompressionResult> => {
  try {
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return await compressPDFBuffer(buffer, file.name);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process file'
    };
  }
};

/**
 * Check if PDF compression would be beneficial
 * @param fileSize - File size in bytes
 * @returns Whether compression is recommended
 */
export const shouldCompressPDF = (fileSize: number): boolean => {
  // Recommend compression for files larger than 1MB
  const COMPRESSION_THRESHOLD = 1024 * 1024; // 1MB
  return fileSize > COMPRESSION_THRESHOLD;
};

/**
 * Format compression statistics for display
 * @param result - Compression result
 * @returns Formatted string with compression statistics
 */
export const formatCompressionStats = (result: CompressionResult): string => {
  if (!result.success || !result.originalSize || !result.compressedSize) {
    return 'Compression statistics unavailable';
  }
  
  const originalMB = (result.originalSize / (1024 * 1024)).toFixed(2);
  const compressedMB = (result.compressedSize / (1024 * 1024)).toFixed(2);
  const savings = result.compressionRatio || 0;
  
  return `Compressed from ${originalMB}MB to ${compressedMB}MB (${savings}% reduction)`;
};

