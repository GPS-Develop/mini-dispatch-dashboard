import { NextRequest, NextResponse } from 'next/server';
import { compressPDFBuffer } from '../../../utils/pdfCompression';

export async function POST(request: NextRequest) {
  try {
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Compress the PDF (compression level is now always 'recommended')
    const result = await compressPDFBuffer(buffer, file.name);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Compression failed' },
        { status: 500 }
      );
    }
    
    // Return the compressed file
    return new NextResponse(result.compressedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name}"`,
        'X-Original-Size': result.originalSize?.toString() || '0',
        'X-Compressed-Size': result.compressedSize?.toString() || '0',
        'X-Compression-Ratio': result.compressionRatio?.toString() || '0'
      }
    });
    
  } catch (error) {
    console.error('PDF compression API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}