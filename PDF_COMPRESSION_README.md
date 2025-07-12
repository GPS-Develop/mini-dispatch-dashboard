# PDF Compression Integration with iLoveAPI

This document describes the PDF compression functionality integrated into the Mini Dispatch Dashboard using the iLoveAPI service and Vercel Blob for large file processing.

## Overview

The application now automatically compresses PDF files during upload to reduce file size and improve storage efficiency. The system uses a dual approach:

- **Small files (<4MB)**: Direct compression via API endpoint using iLoveAPI
- **Large files (≥4MB)**: Upload to Vercel Blob for background processing to bypass Vercel's 4.5MB serverless function limit

This ensures reliable compression for files of all sizes while maintaining optimal performance.

## Features

- **Automatic Compression**: PDFs are automatically compressed based on file size
- **Smart File Routing**: 
  - Files <4MB: Direct compression via API endpoint
  - Files ≥4MB: Background processing via Vercel Blob
- **Configurable Compression Levels**: 
  - `low` - Minimal compression with no quality loss
  - `recommended` - Best balance between compression and quality (default)
  - `extreme` - Maximum compression (may affect quality)
- **Compression Statistics**: Shows original size, compressed size, and compression ratio
- **Background Processing**: Large files are processed asynchronously with real-time status updates
- **Environment Detection**: Automatically detects Vercel deployment for optimal routing
- **Fallback Handling**: If compression fails, the original file is uploaded

## Setup Instructions

### 1. Environment Variables

Add your iLoveAPI credentials and Vercel Blob token to `.env.local`:

```bash
# iLoveAPI PDF Compression
ILOVEPDF_PUBLIC_KEY=your_public_key_here
ILOVEPDF_SECRET_KEY=your_secret_key_here

# Vercel Blob (for large file processing)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

### 2. Get iLoveAPI Credentials

1. Register at [iLoveAPI](https://developer.ilovepdf.com/)
2. Create a new project in your dashboard
3. Copy the Public Key and Secret Key
4. Replace the placeholder values in `.env.local`

### 3. Setup Vercel Blob

1. Go to your Vercel Dashboard
2. Navigate to Storage → Blob
3. Create a new Blob store (or use existing)
4. Copy the read/write token
5. Add the token to your `.env.local` file

## File Structure

### Core Files

- `src/utils/pdfCompression.ts` - Core compression utilities
- `src/app/api/compress-pdf/route.ts` - API endpoint for direct compression (small files)
- `src/app/api/process-large-pdf/route.ts` - API endpoint for Vercel Blob processing (large files)
- `src/utils/documentUtils.ts` - Updated document upload utilities with smart routing
- `src/components/DocumentUploadModal/DocumentUploadModal.tsx` - Updated UI with background processing support

### API Endpoints

#### `/api/compress-pdf` (Direct Compression)
For files <4MB:
- Accepts PDF files via multipart/form-data
- Validates file type and size
- Compresses using iLoveAPI
- Returns compressed PDF with compression statistics in headers

#### `/api/process-large-pdf` (Background Processing)
For files ≥4MB:
- Handles Vercel Blob upload callbacks
- Downloads PDF from Blob storage
- Compresses using iLoveAPI in serverless background
- Uploads compressed result to Supabase Storage
- Updates database with final file location

## Usage

### From Document Upload Modal

1. Open the Document Upload Modal
2. Select PDF files to upload (max 25MB each)
3. The system automatically determines the processing method:
   - **Small files (<4MB)**: Compressed immediately with progress indicator
   - **Large files (≥4MB)**: Shows "Processing in background..." status
4. For background processing:
   - Document appears with "(Processing...)" label
   - View/Delete buttons are disabled during processing
   - Auto-refresh polls for completion every 5 seconds
   - Manual refresh button available if needed
5. Compression statistics are displayed during upload

### Programmatic Usage

```typescript
import { uploadDocument, shouldCompressFile, uploadLargeFileViaBlob } from '../utils/documentUtils';

// Upload document with automatic routing
const result = await uploadDocument(supabase, loadId, file, false, onProgress);

// Check if file should use direct compression or background processing
const useDirectCompression = shouldCompressFile(file);

// For large files, use Vercel Blob directly
if (!useDirectCompression && file.size > 4 * 1024 * 1024) {
  const blobResult = await uploadLargeFileViaBlob(file, loadId);
}
```

## Configuration

### File Size Thresholds

The system uses multiple thresholds for optimal processing:

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB - Overall limit
const MAX_FILE_SIZE_WITH_COMPRESSION = 25 * 1024 * 1024; // 25MB - With compression
const VERCEL_COMPRESSION_LIMIT = 4 * 1024 * 1024; // 4MB - Vercel serverless limit
```

- **Direct compression**: Files <4MB
- **Background processing**: Files ≥4MB (via Vercel Blob)
- **Maximum file size**: 25MB total limit

### Compression Levels

- **Low**: Minimal compression, preserves quality
- **Recommended**: Balanced compression (default)
- **Extreme**: Maximum compression, may reduce quality

### Temporary Files

The compression process creates temporary files differently based on environment:

- **Local development**: `temp/pdf-compression/` directory
- **Vercel deployment**: `/tmp/pdf-compression/` directory (serverless-compatible)
- **Vercel Blob**: Temporary files in Blob storage (automatically cleaned up)

All temporary files are automatically cleaned up after processing.

## Error Handling

The system handles various error scenarios:

1. **Invalid API Credentials**: Returns error message
2. **File Too Large**: Validates against 25MB limit
3. **Invalid File Type**: Only accepts PDF files
4. **Compression Failure**: Falls back to original file (if <10MB)
5. **Network Issues**: Displays appropriate error messages
6. **Background Processing Failures**: Documents marked as "Failed" with error details
7. **Vercel Serverless Limits**: Automatically routes large files to background processing
8. **Database Connection Issues**: Handled gracefully with retry logic

## Performance Considerations

- **Smart Routing**: Files automatically routed to optimal processing method
- **Server-side Processing**: All compression performed server-side
- **Background Processing**: Large files processed asynchronously to avoid timeouts
- **Environment Detection**: Automatically adapts to local vs. Vercel deployment
- **Temporary File Cleanup**: All temporary files cleaned up automatically
- **Progress Indicators**: Real-time status updates for all file sizes
- **Auto-refresh**: UI automatically updates when background processing completes
- **Polling Optimization**: Intelligent polling that stops when no processing files remain

## Security

- **Environment Variables**: API keys and tokens stored securely in environment variables
- **File Validation**: Strict PDF-only validation on both client and server
- **Temporary File Cleanup**: All temporary files cleaned up after processing
- **HTTPS Communication**: All communication with iLoveAPI and Vercel Blob over HTTPS
- **Server-side Authorization**: Supabase service role key used for background processing
- **Access Control**: Vercel Blob uploads scoped to specific load IDs
- **Error Sanitization**: Error messages sanitized to prevent information leakage

## Troubleshooting

### Common Issues

1. **"iLoveAPI credentials not configured"**
   - Ensure `ILOVEPDF_PUBLIC_KEY` and `ILOVEPDF_SECRET_KEY` are set in `.env.local`

2. **"Compression failed"**
   - Check API key validity
   - Verify file is a valid PDF
   - Check network connectivity

3. **"413 Content Too Large" errors**
   - Should be automatically resolved by Vercel Blob routing
   - Ensure `BLOB_READ_WRITE_TOKEN` is configured
   - Check Vercel Blob storage is accessible

4. **Documents stuck in "Processing..." status**
   - Check Vercel function logs for background processing errors
   - Verify Supabase service role key is correct
   - Use manual refresh button or wait for auto-refresh

5. **Large files not being processed**
   - Ensure Vercel Blob token is configured
   - Check file size is under 25MB limit
   - Verify `/api/process-large-pdf` endpoint is accessible

### Debug Mode

To debug issues:

1. **Check Vercel Function Logs**:
   ```bash
   vercel logs
   ```

2. **Monitor Background Processing**:
   - Check `/api/process-large-pdf` function logs
   - Look for "PDF processing error" messages

3. **Local Development**:
   ```bash
   NODE_ENV=development
   ```
   This enables additional logging for compression attempts.

4. **Database Inspection**:
   - Check `load_documents` table for entries with `file_url: 'processing'`
   - Look for failed entries with `file_url: 'failed: [error message]'`

## Future Enhancements

Potential improvements:

1. **Real-time Notifications**: WebSocket/SSE updates for background processing completion
2. **Batch Compression**: Compress multiple files in a single API call
3. **Compression Preview**: Show estimated compression before upload
4. **Custom Compression Settings**: Per-file compression level selection
5. **Compression History**: Track compression statistics over time
6. **Quality Metrics**: Analyze compression quality impact
7. **Retry Logic**: Automatic retry for failed background processing
8. **Progress Webhooks**: More granular progress updates during background processing
9. **File Format Support**: Support for other document types beyond PDF

## Support

For issues related to:
- **iLoveAPI service**: [iLoveAPI Support](https://developer.ilovepdf.com/support)
- **Vercel Blob**: [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- **Integration code**: Check application logs and error messages
- **Performance**: Monitor compression times and file sizes
- **Background processing**: Check Vercel function logs and database entries

## License & Pricing

This integration uses external services with their own terms and pricing:

- **iLoveAPI**: Review [iLoveAPI pricing](https://developer.ilovepdf.com/pricing) for compression costs
- **Vercel Blob**: Review [Vercel Blob pricing](https://vercel.com/docs/storage/vercel-blob/usage-and-pricing) for storage costs

Both services offer generous free tiers suitable for development and small-scale production use.