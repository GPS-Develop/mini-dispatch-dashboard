// Simple test function to check iLoveAPI credentials
export async function testILovePDFCredentials(): Promise<void> {
  try {
    console.log('🧪 Testing iLoveAPI credentials...');
    
    const response = await fetch('/api/test-ilovepdf');
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ API credentials are working!');
      console.log('📄 Details:', result.details);
      console.log('💡 Message:', result.message);
    } else {
      console.error('❌ API credentials test failed');
      console.error('📄 Error:', result.error);
      console.error('📄 Details:', result.details);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to test API credentials:', error);
    throw error;
  }
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as { testILovePDF?: typeof testILovePDFCredentials }).testILovePDF = testILovePDFCredentials;
}