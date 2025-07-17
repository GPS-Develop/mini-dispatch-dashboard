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

export function validatePdfFile(file: File): boolean {
  // Check if file is PDF
  if (file.type !== 'application/pdf') {
    throw new Error('Please upload a PDF file');
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('PDF file is too large. Maximum size is 10MB');
  }
  
  return true;
}

