import { NextRequest, NextResponse } from "next/server";
import { getAuthCookies } from "@/lib/auth/cookies";
import { getUserDataFromJWT } from "@/lib/auth/utils";

export async function GET(request: NextRequest) {
  try {
    const cookies = await getAuthCookies();
    const accessToken = cookies.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found" },
        { status: 401 }
      );
    }

    // Get full user data from JWT
    const userData = await getUserDataFromJWT();
    
    if (!userData) {
      return NextResponse.json(
        { error: "Failed to parse user data" },
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      user: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        tenantIds: userData.tenantIds,
        selectedTenantId: userData.selectedTenantId
      }
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json(
      { error: "Failed to get user data" },
      { status: 500 }
    );
  }
}
