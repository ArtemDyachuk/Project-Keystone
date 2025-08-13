import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Create redirect response
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));

    // Clear all authentication cookies in the redirect response
    const expiredDate = new Date(0);

    redirectResponse.cookies.set("accessToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiredDate,
    });

    redirectResponse.cookies.set("idToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiredDate,
    });

    redirectResponse.cookies.set("refreshToken", "", {
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
