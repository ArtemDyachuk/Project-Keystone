import { NextRequest, NextResponse } from "next/server";
import { createTenantManagementService } from "../../../../lib/tenant-management";
import { getUserDataFromJWT } from "../../../../lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const userData = await getUserDataFromJWT();
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's tenants using Firebase service
    const tenantService = createTenantManagementService();
    const userTenants = await tenantService.getUserTenants(userData.sub);

    return NextResponse.json({
      success: true,
      tenants: userTenants,
      count: userTenants.length
    });

  } catch (error) {
    console.error("Failed to get user tenants:", error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to get tenants" 
      },
      { status: 500 }
    );
  }
}
