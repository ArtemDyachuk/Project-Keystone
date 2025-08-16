import { NextRequest, NextResponse } from "next/server";
import { createTenantManagementService } from "../../../../lib/tenant-management";
import { getUserDataFromJWT } from "../../../../lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const userData = await getUserDataFromJWT();
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { name, domain } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Tenant name is required" },
        { status: 400 }
      );
    }

    // Create tenant using Firebase service
    const tenantService = createTenantManagementService();
    const tenant = await tenantService.createTenant(
      { name, domain },
      userData.sub
    );

    return NextResponse.json({
      success: true,
      tenant,
      message: `Tenant "${name}" created successfully`
    });

  } catch (error) {
    console.error("Failed to create tenant:", error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to create tenant" 
      },
      { status: 500 }
    );
  }
}
