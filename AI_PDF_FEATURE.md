# AI PDF Auto-Fill Feature

## Overview
The AI PDF Auto-Fill feature allows admins to upload PDF documents (like bills of lading, load sheets, or rate confirmations) and automatically extract relevant information to fill the load creation form.

## How It Works

### 1. Upload PDF
- Click or drag-and-drop a PDF file (max 10MB)
- The system validates the file type and size
- PDF is converted to base64 format for AI processing

### 2. AI Processing
- PDF is sent directly to Google Gemini AI (no text extraction needed)
- AI analyzes the document using computer vision and NLP
- Multiple models are tried automatically if one is overloaded
- Structured data is returned in JSON format

### 3. Auto-Fill Form
- Extracted data automatically populates form fields
- Visual indicators show which fields were auto-filled
- Users can review and modify any extracted information

## Supported Data Extraction

### Basic Load Information
- **Reference ID**: BOL numbers, load numbers, PRO numbers
- **Load Type**: Reefer, Dry Van, Flatbed
- **Temperature**: For refrigerated loads
- **Rate**: Payment amount

### Location Information
- **Pickup Locations**: Name, address, city, state, postal code, date/time
- **Delivery Locations**: Name, address, city, state, postal code, date/time

### Broker Information
- **Broker Name**: Company name
- **Contact**: Phone number
- **Email**: Email address

## Setup Instructions

### 1. Get Google API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add to `.env.local`:
```
GOOGLE_API_KEY=your_actual_api_key_here
```

### 2. Dependencies
The following packages are automatically installed:
- `@google/generative-ai`: Google Gemini AI client for direct PDF processing

## Usage

### 1. Navigate to Add Load Page
- Go to `/add-load` in your application
- You'll see the AI PDF upload component at the top

### 2. Upload PDF
- Click "Choose PDF File" or drag and drop a PDF
- Wait for processing (usually 2-5 seconds)
- Review extracted data

### 3. Review and Submit
- Check auto-filled fields (highlighted in green)
- Modify any incorrect information
- Submit the form normally

## Error Handling

### Common Issues
1. **PDF too large**: Maximum 10MB file size
2. **Invalid file type**: Only PDF files accepted
3. **No text found**: Scanned PDFs might not work well
4. **API key missing**: Check environment variables
5. **AI processing failed**: Network or API issues

### Troubleshooting
- Ensure PDF contains readable text (not just images)
- Check that Google API key is valid and has credits
- Verify internet connection for API calls

## Technical Details

### Files Created
- `src/config/aiConfig.ts`: AI configuration and types
- `src/utils/pdfUtils.ts`: PDF validation and base64 conversion utilities
- `src/app/api/ai-extract-pdf/route.ts`: API endpoint for AI processing
- `src/components/AiPdfUpload/AiPdfUpload.tsx`: Upload component
- Modified `src/features/loads/AddLoadPage.tsx`: Form integration

### API Costs
- **Google Gemini**: Free tier provides 15 requests/minute, 1M requests/day
- **Typical usage**: 1-5 requests per PDF upload
- **Monthly cost**: $0 for typical usage (free tier)

## Future Enhancements

### Potential Improvements
1. **OCR Support**: Handle scanned PDFs better
2. **Multi-page PDFs**: Process multiple pages
3. **Confidence Scoring**: Show extraction confidence levels
4. **Learning System**: Improve accuracy over time
5. **Batch Processing**: Upload multiple PDFs at once

### Custom Document Types
The AI can be trained to recognize specific document formats used by your company or brokers by updating the prompt in `ai-extract-pdf/route.ts`.

## Support

For issues or questions about this feature:
1. Check the browser console for error messages
2. Verify API key configuration
3. Test with different PDF formats
4. Contact development team for assistance