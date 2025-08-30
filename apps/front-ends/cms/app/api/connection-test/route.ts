import { NextResponse } from 'next/server';
import { config } from '../../../lib/config';

export async function GET() {
  const startTime = Date.now();

  try {
    // Test backend API connection instead of direct database access
    const response = await fetch(`${config.apiBaseUrl}/api/health`, {
      method: 'GET',
      cache: 'no-store',
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return NextResponse.json({
        status: 'success',
        method: 'Backend API Call',
        connected: true,
        responseTime,
        tenantCount: 0, // Hidden for security in multi-tenant system
        message: 'Successfully connected to backend API'
      });
    } else {
      throw new Error(`Backend API returned ${response.status}`);
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'error',
      method: 'Backend API Call',
      connected: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to connect to backend API'
    }, { status: 500 });
  }
}
