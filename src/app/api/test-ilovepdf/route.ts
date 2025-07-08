import { NextResponse } from 'next/server';
import ILovePDFApi from '@ilovepdf/ilovepdf-nodejs';

export async function GET() {
  try {
    const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
    const secretKey = process.env.ILOVEPDF_SECRET_KEY;
    
    // Check if credentials are configured
    if (!publicKey || !secretKey) {
      return NextResponse.json({
        success: false,
        error: 'API credentials not configured',
        details: {
          publicKey: publicKey ? 'Set' : 'Missing',
          secretKey: secretKey ? 'Set' : 'Missing'
        }
      }, { status: 400 });
    }
    
    // Check if credentials are placeholder values
    if (publicKey === 'your_public_key_here' || secretKey === 'your_secret_key_here') {
      return NextResponse.json({
        success: false,
        error: 'API credentials are still set to placeholder values',
        details: {
          publicKey: publicKey === 'your_public_key_here' ? 'Placeholder' : 'Set',
          secretKey: secretKey === 'your_secret_key_here' ? 'Placeholder' : 'Set'
        }
      }, { status: 400 });
    }
    
    console.log('Testing iLoveAPI credentials...');
    console.log('Public Key:', publicKey.substring(0, 20) + '...');
    console.log('Secret Key:', secretKey.substring(0, 20) + '...');
    
    // Initialize the API
    const ilovepdf = new ILovePDFApi(publicKey, secretKey);
    
    // Create a test task (compress)
    const testTask = ilovepdf.newTask('compress');
    
    console.log('Created test task, attempting to start...');
    
    // Try to start the task (this will validate credentials)
    const startResult = await testTask.start();
    
    console.log('Task started successfully:', startResult);
    
    // If we get here, credentials are working
    return NextResponse.json({
      success: true,
      message: 'iLoveAPI credentials are working correctly',
      details: {
        publicKey: `${publicKey.substring(0, 20)}...`,
        taskId: 'Task started successfully',
        apiVersion: 'v1',
        startResult: startResult ? 'Task created' : 'Unknown'
      }
    });
    
  } catch (error) {
    console.error('iLoveAPI test error:', error);
    
    let errorMessage = 'Unknown error';
    let errorCode = 500;
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; data?: unknown } };
      errorCode = axiosError.response?.status || 500;
      
      if (errorCode === 401) {
        errorMessage = 'Invalid API credentials (401 Unauthorized)';
      } else if (errorCode === 403) {
        errorMessage = 'API access forbidden - check your subscription (403 Forbidden)';
      } else if (errorCode === 400) {
        errorMessage = 'Bad request - check your API key format (400 Bad Request)';
      } else {
        errorMessage = `API error (${errorCode})`;
      }
      
      console.error('API Response:', axiosError.response?.data);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: {
        errorCode,
        fullError: error instanceof Error ? error.message : 'Unknown error type'
      }
    }, { status: errorCode });
  }
}

// Also handle POST for form submissions
export async function POST() {
  return GET();
}