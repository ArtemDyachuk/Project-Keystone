import { NextRequest } from "next/server";
import { clearAuthCookies } from "../../../../lib/auth-cookies";

export async function POST(request: NextRequest) {
  try {
    // Clear all authentication cookies
    const response = clearAuthCookies();
    
    return response;
  } catch (error) {
    return clearAuthCookies(); // Still clear cookies even if there's an error
  }
}
