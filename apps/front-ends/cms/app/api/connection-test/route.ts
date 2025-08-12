import { NextResponse } from 'next/server';
import { TenantService, connectToDatabase } from '@keystone/database';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Ensure database connection is established
    await connectToDatabase();
    
    // Test server-side direct database access using shared TenantService
    const tenants = await TenantService.getAllTenants();
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'success',
      method: 'Server-Side Direct DB',
      connected: true,
      responseTime,
      tenantCount: tenants.length,
      message: 'Successfully accessed database via shared TenantService'
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
