'use client';

import React, { useState } from 'react';
import Button from '../../components/Button/Button';

export default function TestILovePDFPage() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    details?: Record<string, unknown>;
  } | null>(null);

  const testAPI = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-ilovepdf');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to connect to test endpoint',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>iLoveAPI Credentials Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Use this page to test if your iLoveAPI credentials are configured correctly.</p>
        <p style={{ fontSize: '14px', color: '#666' }}>
          This will attempt to create a test task with the iLoveAPI service to verify your credentials.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <Button 
          variant="primary" 
          onClick={testAPI} 
          disabled={testing}
        >
          {testing ? 'Testing...' : 'Test API Credentials'}
        </Button>
      </div>

      {result && (
        <div 
          style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: result.success ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${result.success ? '#10b981' : '#ef4444'}`,
            marginBottom: '20px'
          }}
        >
          <h3 style={{ 
            margin: '0 0 12px 0', 
            color: result.success ? '#065f46' : '#991b1b' 
          }}>
            {result.success ? '✅ Success' : '❌ Error'}
          </h3>
          
          <p style={{ 
            margin: '0 0 12px 0', 
            color: result.success ? '#065f46' : '#991b1b' 
          }}>
            {result.message || result.error}
          </p>

          {result.details && (
            <div>
              <h4 style={{ 
                margin: '12px 0 8px 0', 
                fontSize: '14px', 
                color: result.success ? '#065f46' : '#991b1b' 
              }}>
                Details:
              </h4>
              <pre style={{ 
                backgroundColor: result.success ? '#ecfdf5' : '#fef2f2',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                color: result.success ? '#065f46' : '#991b1b'
              }}>
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div style={{ 
        backgroundColor: '#f9fafb', 
        padding: '16px', 
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
          Environment Variables
        </h3>
        <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
          Make sure you have these environment variables set in your <code>.env.local</code> file:
        </p>
        <pre style={{ 
          backgroundColor: '#f3f4f6',
          padding: '12px',
          borderRadius: '4px',
          fontSize: '12px',
          overflow: 'auto',
          margin: '8px 0'
        }}>
{`ILOVEPDF_PUBLIC_KEY=your_actual_public_key_here
ILOVEPDF_SECRET_KEY=your_actual_secret_key_here`}
        </pre>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
          You can get these keys from your <a href="https://developer.ilovepdf.com/user/projects" target="_blank" rel="noopener noreferrer">iLoveAPI dashboard</a>.
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#fef3c7', 
        padding: '16px', 
        borderRadius: '8px',
        border: '1px solid #f59e0b',
        marginTop: '16px'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#92400e' }}>
          Common Issues
        </h3>
        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#92400e' }}>
          <li>Make sure to restart your development server after changing environment variables</li>
          <li>Check that your API keys don&apos;t have any extra spaces or characters</li>
          <li>Verify that your iLoveAPI account is active and has available credits</li>
          <li>Ensure you&apos;re using the correct public and secret keys (not just one of them)</li>
        </ul>
      </div>
    </div>
  );
}