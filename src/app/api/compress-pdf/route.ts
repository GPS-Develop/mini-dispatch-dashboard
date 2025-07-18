import { NextRequest, NextResponse } from 'next/server';
import { compressPDFBuffer } from '../../../utils/pdfCompression';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type and structure
    try {
      const { validatePdfFile } = await import('@/utils/pdfUtils');
      await validatePdfFile(file);
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Invalid PDF file' },
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
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ].filter(Boolean);

  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}