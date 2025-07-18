import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, ExtractedLoadData } from '@/config/aiConfig';
import { convertPdfToBase64, validatePdfFile } from '@/utils/pdfUtils';
import { GenerateContentResult } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';

const LOAD_EXTRACTION_PROMPT = `
You are a logistics expert that extracts load information from shipping documents, bills of lading, and load sheets.

Analyze this PDF document and extract relevant information. Return the data in the exact JSON format below.

Expected JSON structure:
{
  "referenceId": "string or null",
  "loadType": "Reefer" | "Dry Van" | "Flatbed" | null,
  "temperature": number or null (only for Reefer loads),
  "rate": number or null,
  "pickupLocations": [
    {
      "locationName": "string or null",
      "address": "string or null",
      "city": "string or null",
      "state": "string or null",
      "postalCode": "string or null",
      "dateTime": "string or null (ISO format if possible)"
    }
  ],
  "deliveryLocations": [
    {
      "locationName": "string or null",
      "address": "string or null",
      "city": "string or null",
      "state": "string or null",
      "postalCode": "string or null",
      "dateTime": "string or null (ISO format if possible)"
    }
  ],
  "brokerInfo": {
    "name": "string or null",
    "contact": "string or null (phone number)",
    "email": "string or null"
  },
  "confidence": number (0-100, your confidence in the extraction accuracy)
}

Instructions:
- Look for common terms like "BOL", "Load #", "Reference", "PRO#" for referenceId
- Identify equipment types: "Reefer", "Refrigerated", "Dry Van", "Flatbed", "Trailer"
- Extract temperatures for refrigerated loads (look for °F or °C)
- Find rate information (look for $, "Rate", "Amount", "Total")
- Identify pickup/delivery locations with addresses, cities, states, ZIP codes
- Look for dates and times for pickup/delivery appointments
- Find broker/shipper contact information
- Return null for fields that cannot be found
- Provide arrays even if empty []
- Be conservative with confidence scoring
- Return ONLY the JSON object, no additional text
`;

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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate PDF file
    await validatePdfFile(file);
    
    // Convert PDF to base64 for AI processing
    const base64Pdf = await convertPdfToBase64(file);
    
    // Get Gemini client
    const genAI = getGeminiClient();
    
    // List of free models to try (in order of preference)
    const availableModels = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gemini-pro'
    ];
    
    // Try different models if one is overloaded
    let result: GenerateContentResult | null = null;
    
    for (const modelName of availableModels) {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.1,
        }
      });
      
      // Try each model with retry mechanism
      let attempt = 0;
      const maxAttempts = 2;
      let modelSuccess = false;
    
      while (attempt < maxAttempts && !modelSuccess) {
        try {
          attempt++;
          
          result = await Promise.race([
            model.generateContent([
              {
                text: LOAD_EXTRACTION_PROMPT
              },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Pdf
                }
              }
            ]),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('AI request timeout after 30 seconds')), 30000)
            )
          ]);
          
          modelSuccess = true;
          break; // Success, exit retry loop
          
        } catch {
          if (attempt < maxAttempts) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      if (modelSuccess) {
        break; // Successfully got response, exit model loop
      }
    }
    
    if (!result) {
      throw new Error('All Google AI models failed or are overloaded. Please try again later.');
    }
    
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    let extractedData: ExtractedLoadData;
    try {
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      extractedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }
    
    // Validate and clean the extracted data
    const validatedData = validateExtractedData(extractedData);
    
    return NextResponse.json({
      success: true,
      data: validatedData
    });
    
  } catch (error) {
    console.error('Error in AI PDF processing:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process PDF with AI',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

function validateExtractedData(data: unknown): ExtractedLoadData {
  // Type guard to ensure data is an object
  if (!data || typeof data !== 'object') {
    return {
      pickupLocations: [],
      deliveryLocations: [],
      brokerInfo: {},
      confidence: 0
    };
  }
  
  const obj = data as Record<string, unknown>;
  
  // Ensure required structure and validate data types
  const validated: ExtractedLoadData = {
    referenceId: typeof obj.referenceId === 'string' ? obj.referenceId : undefined,
    loadType: ['Reefer', 'Dry Van', 'Flatbed'].includes(obj.loadType as string) ? obj.loadType as 'Reefer' | 'Dry Van' | 'Flatbed' : undefined,
    temperature: typeof obj.temperature === 'number' ? obj.temperature : undefined,
    rate: typeof obj.rate === 'number' ? obj.rate : undefined,
    pickupLocations: Array.isArray(obj.pickupLocations) ? obj.pickupLocations : [],
    deliveryLocations: Array.isArray(obj.deliveryLocations) ? obj.deliveryLocations : [],
    brokerInfo: obj.brokerInfo && typeof obj.brokerInfo === 'object' ? obj.brokerInfo : {},
    confidence: typeof obj.confidence === 'number' ? Math.max(0, Math.min(100, obj.confidence)) : 50
  };
  
  return validated;
}