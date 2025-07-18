export async function convertPdfToBase64(file: File): Promise<string> {
  try {
    // Convert File to ArrayBuffer, then to base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  } catch (error) {
    console.error('Error converting PDF to base64:', error);
    throw new Error('Failed to convert PDF to base64: ' + (error as Error).message);
  }
}

export async function validatePdfFile(file: File): Promise<boolean> {
  // Check if file is PDF by MIME type
  if (file.type !== 'application/pdf') {
    throw new Error('Please upload a PDF file');
  }
  
  // Check file size (max 25MB)
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (file.size > maxSize) {
    throw new Error('PDF file is too large. Maximum size is 25MB');
  }

  // Check minimum file size (PDF header is at least 1KB)
  if (file.size < 1024) {
    throw new Error('File is too small to be a valid PDF');
  }
  
  // Validate PDF magic number (file signature)
  await validatePdfMagicNumber(file);
  
  return true;
}

async function validatePdfMagicNumber(file: File): Promise<void> {
  try {
    // Read the first 8 bytes to check for PDF magic number
    const arrayBuffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // PDF files start with "%PDF-" (25 50 44 46 2D in hex)
    const pdfMagic = [0x25, 0x50, 0x44, 0x46, 0x2D]; // %PDF-
    
    // Check if the file starts with PDF magic number
    let isValidPdf = true;
    for (let i = 0; i < pdfMagic.length; i++) {
      if (bytes[i] !== pdfMagic[i]) {
        isValidPdf = false;
        break;
      }
    }
    
    if (!isValidPdf) {
      throw new Error('File is not a valid PDF (invalid file signature)');
    }
    
    // Additional check: ensure the version number follows (%PDF-1.x)
    if (bytes[5] !== 0x31 || bytes[6] !== 0x2E) { // "1."
      throw new Error('Unsupported PDF version or corrupted file');
    }
    
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to validate PDF file structure');
  }
}

