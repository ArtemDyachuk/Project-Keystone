import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return await handleSignout(request);
}

export async function POST(request: NextRequest) {
  return await handleSignout(request);
}

async function handleSignout(request: NextRequest) {
  try {
    // Create redirect response
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));

    // Clear the session cookie in the redirect response
    const expiredDate = new Date(0);

    redirectResponse.cookies.set("fb_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiredDate,
    });

    return redirectResponse;
  } catch (error) {
    // If something goes wrong, still try to redirect
    return NextResponse.redirect(new URL("/", request.url));
  }
}
