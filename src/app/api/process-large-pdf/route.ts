import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { createClient } from '@supabase/supabase-js';
import { compressPDFBuffer } from '../../../utils/pdfCompression';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string, clientPayload: string | null) => {
        // TODO: Add authentication check here
        // const { user } = await auth(request);
        // if (!user) throw new Error('Not authenticated');

        // Parse the client payload to get loadId
        let loadId = '';
        if (clientPayload) {
          try {
            const payload = JSON.parse(clientPayload);
            loadId = payload.loadId;
          } catch {
            // Silent fail - will be handled in processing
          }
        }

        return {
          allowedContentTypes: ['application/pdf'],
          tokenPayload: JSON.stringify({
            loadId,
            uploadTime: Date.now(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          // Parse the token payload
          const payload = JSON.parse(tokenPayload || '{}');
          
          // Process the PDF in the background
          await processLargePDF(blob.url, blob.pathname, payload);
          
        } catch (error) {
          console.error('Background processing failed:', error);
          // TODO: Implement proper error handling/retry logic
          throw new Error(`Could not process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Large PDF upload handler error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

async function processLargePDF(blobUrl: string, pathname: string, payload: { loadId: string; uploadTime: number }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    const { loadId } = payload;
    
    // Extract original filename from pathname
    const originalFileName = pathname.split('/').pop() || pathname;
    const cleanFileName = originalFileName.replace(/^\d+_/, ''); // Remove timestamp prefix
    
    // 1. Create a processing entry in the database
    const { data: processingEntry, error: dbError } = await supabase
      .from('load_documents')
      .insert({
        load_id: loadId,
        file_name: cleanFileName,
        file_url: 'processing', // Special status to indicate processing
      })
      .select()
      .single();
    
    if (dbError) {
      throw new Error(`Database entry failed: ${dbError.message}`);
    }
    
    // 2. Download the PDF from Vercel Blob
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 3. Compress the PDF using iLoveAPI
    const compressionResult = await compressPDFBuffer(buffer, cleanFileName);
    
    if (!compressionResult.success) {
      // Update database entry with error status - just mark as failed in file_url
      await supabase
        .from('load_documents')
        .update({
          file_url: `failed: ${compressionResult.error}`
        })
        .eq('id', processingEntry.id);
      
      throw new Error(`Compression failed: ${compressionResult.error}`);
    }
    
    // 4. Upload compressed PDF to Supabase Storage
    const timestamp = Date.now();
    const fileName = `${timestamp}_${cleanFileName}`;
    const filePath = `load_${loadId}/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('load-pdfs')
      .upload(filePath, compressionResult.compressedBuffer!, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (uploadError) {
      // Update database entry with error status
      await supabase
        .from('load_documents')
        .update({
          file_url: `failed: ${uploadError.message}`
        })
        .eq('id', processingEntry.id);
      
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }
    
    // 5. Update database entry with final details
    await supabase
      .from('load_documents')
      .update({
        file_url: uploadData.path
      })
      .eq('id', processingEntry.id);
    
    // 6. Log document upload activity
    try {
      const { data: loadData } = await supabase
        .from('loads')
        .select('reference_id, driver_id, drivers!inner(name)')
        .eq('id', loadId)
        .single();
      
      if (loadData) {
        const driverName = (loadData as { drivers?: { name?: string } }).drivers?.name || 'Unknown Driver';
        
        await supabase.rpc('add_document_upload_activity', {
          p_driver_name: driverName,
          p_load_reference_id: loadData.reference_id,
          p_file_name: cleanFileName
        });
      }
    } catch (activityError) {
      console.error('Failed to log document upload activity:', activityError);
    }
    
    // 7. Delete the temporary file from Vercel Blob
    await del(blobUrl);
    
  } catch (error) {
    console.error('PDF processing error:', error);
    
    // Try to update the database entry to mark as failed
    try {
      await supabase
        .from('load_documents')
        .update({
          file_url: `failed: ${error instanceof Error ? error.message : 'Unknown processing error'}`
        })
        .eq('load_id', payload.loadId)
        .eq('file_name', pathname.split('/').pop()?.replace(/^\d+_/, '') || pathname);
    } catch (dbError) {
      console.error('Failed to update database with error status:', dbError);
    }
    
    // TODO: Implement proper error handling and user notification
    throw error;
  }
}