# PDF Compression Integration with iLoveAPI

This document describes the PDF compression functionality integrated into the Mini Dispatch Dashboard using the iLoveAPI service.

## Overview

The application now automatically compresses PDF files during upload to reduce file size and improve storage efficiency. The compression is handled by the iLoveAPI service, which provides high-quality PDF compression with configurable compression levels.

## Features

- **Automatic Compression**: PDFs larger than 1MB are automatically compressed
- **Configurable Compression Levels**: 
  - `low` - Minimal compression with no quality loss
  - `recommended` - Best balance between compression and quality (default)
  - `extreme` - Maximum compression (may affect quality)
- **Compression Statistics**: Shows original size, compressed size, and compression ratio
- **User Control**: Users can enable/disable compression and choose compression level
- **Fallback Handling**: If compression fails, the original file is uploaded

## Setup Instructions

### 1. Environment Variables

Add your iLoveAPI credentials to `.env.local`:

```bash
# iLoveAPI PDF Compression
ILOVEPDF_PUBLIC_KEY=your_public_key_here
ILOVEPDF_SECRET_KEY=your_secret_key_here
```

### 2. Get iLoveAPI Credentials

1. Register at [iLoveAPI](https://developer.ilovepdf.com/)
2. Create a new project in your dashboard
3. Copy the Public Key and Secret Key
4. Replace the placeholder values in `.env.local`

## File Structure

### Core Files

- `src/utils/pdfCompression.ts` - Core compression utilities
- `src/app/api/compress-pdf/route.ts` - API endpoint for compression
- `src/utils/documentUtils.ts` - Updated document upload utilities
- `src/components/DocumentUploadModal/DocumentUploadModal.tsx` - Updated UI with compression controls

### API Endpoint

The compression is handled by a server-side API endpoint at `/api/compress-pdf` that:
- Accepts PDF files via multipart/form-data
- Validates file type and size
- Compresses using iLoveAPI
- Returns compressed PDF with compression statistics in headers

## Usage

### From Document Upload Modal

1. Open the Document Upload Modal
2. Configure compression settings:
   - Enable/disable compression
   - Choose compression level
3. Select PDF files to upload
4. Files larger than 1MB will be compressed automatically
5. Compression statistics are displayed during upload

### Programmatic Usage

```typescript
import { compressPDFFile } from '../utils/documentUtils';

// Compress a PDF file
const result = await compressPDFFile(file, {
  enabled: true,
  level: 'recommended'
});

if (result.success) {
  console.log(`Compressed from ${result.originalSize} to ${result.compressedSize} bytes`);
  console.log(`Compression ratio: ${result.compressionRatio}%`);
}
```

## Configuration

### Compression Threshold

Files larger than 1MB are considered for compression. This can be adjusted in `src/utils/documentUtils.ts`:

```typescript
const COMPRESSION_THRESHOLD = 1024 * 1024; // 1MB
```

### Compression Levels

- **Low**: Minimal compression, preserves quality
- **Recommended**: Balanced compression (default)
- **Extreme**: Maximum compression, may reduce quality

### Temporary Files

The compression process creates temporary files in `temp/pdf-compression/` directory. These are automatically cleaned up after processing.

## Error Handling

The system handles various error scenarios:

1. **Invalid API Credentials**: Returns error message
2. **File Too Large**: Validates against 10MB limit
3. **Invalid File Type**: Only accepts PDF files
4. **Compression Failure**: Falls back to original file
5. **Network Issues**: Displays appropriate error messages

## Performance Considerations

- Compression is performed server-side to avoid client-side processing
- Temporary files are cleaned up automatically
- Large files may take longer to compress
- Progress indicators show upload status

## Security

- API keys are stored securely in environment variables
- File validation prevents non-PDF uploads
- Temporary files are cleaned up after processing
- All communication with iLoveAPI is over HTTPS

## Troubleshooting

### Common Issues

1. **"iLoveAPI credentials not configured"**
   - Ensure `ILOVEPDF_PUBLIC_KEY` and `ILOVEPDF_SECRET_KEY` are set in `.env.local`

2. **"Compression failed"**
   - Check API key validity
   - Verify file is a valid PDF
   - Check network connectivity

3. **Files not being compressed**
   - Ensure file is larger than 1MB
   - Check that compression is enabled in UI
   - Verify API endpoint is accessible

### Debug Mode

To enable debug logging, add to your environment:

```bash
NODE_ENV=development
```

This will log compression attempts and results to the console.

## Future Enhancements

Potential improvements:

1. **Batch Compression**: Compress multiple files in a single API call
2. **Compression Preview**: Show estimated compression before upload
3. **Custom Compression Settings**: Per-file compression level selection
4. **Compression History**: Track compression statistics over time
5. **Quality Metrics**: Analyze compression quality impact

## Support

For issues related to:
- iLoveAPI service: [iLoveAPI Support](https://developer.ilovepdf.com/support)
- Integration code: Check the application logs and error messages
- Performance: Monitor compression times and file sizes

## License

This integration uses the iLoveAPI service which has its own terms of service and pricing. Please review the iLoveAPI documentation for usage limits and pricing information.