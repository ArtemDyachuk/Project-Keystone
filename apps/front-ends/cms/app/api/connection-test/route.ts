import { NextResponse } from 'next/server';
import { connectToDatabase } from '@keystone/database';

export async function GET() {
  const startTime = Date.now();

  try {
    // Ensure database connection is established
    await connectToDatabase();

    // Test server-side direct database access - removed tenant count for security
    // In multi-tenant systems, connection tests should not expose tenant information
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'success',
      method: 'Server-Side Direct DB',
      connected: true,
      responseTime,
      tenantCount: 0, // Hidden for security in multi-tenant system
      message: 'Successfully connected to database (tenant data hidden for security)'
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'error',
      method: 'Server-Side Direct DB',
      connected: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to access database via shared TenantService'
    }, { status: 500 });
  }
}
