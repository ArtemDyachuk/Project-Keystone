import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAdminAuth } from "@keystone/auth";

const EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(req: NextRequest) {
   try {
      const { idToken } = await req.json();

      // TODO: Add CSRF verification here
      // if (!csrfToken || !verifyCSRF(csrfToken)) {
      //   return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
      // }

      if (!idToken) {
         return NextResponse.json({ error: "No ID token provided" }, { status: 400 });
      }

      console.log("🔄 Creating Firebase session cookie...");

      const adminAuth = getFirebaseAdminAuth();
      const sessionCookie = await adminAuth.createSessionCookie(idToken, {
         expiresIn: EXPIRES_IN
      });

      console.log("✅ Firebase session cookie created");

      const cookieStore = await cookies();
      cookieStore.set("fb_session", sessionCookie, {
         httpOnly: true,
         secure: process.env.NODE_ENV === "production", // true in production, false in dev
         sameSite: "lax",
         path: "/",
         maxAge: EXPIRES_IN / 1000,
         // domain: ".example.com", // uncomment if using subdomains
      });

      return NextResponse.json({
         ok: true,
         message: "Session created successfully"
      });

   } catch (error) {
      console.error("❌ Failed to create session:", error);
      return NextResponse.json({
         error: "Failed to create session"
      }, { status: 500 });
   }
}

export async function DELETE() {
   try {
      console.log("🔄 Clearing session cookie...");

      const cookieStore = await cookies();
      cookieStore.set("fb_session", "", {
         path: "/",
         maxAge: 0
      });

      console.log("✅ Session cookie cleared");

      return NextResponse.json({
         ok: true,
         message: "Session cleared successfully"
      });

   } catch (error) {
      console.error("❌ Failed to clear session:", error);
      return NextResponse.json({
         error: "Failed to clear session"
      }, { status: 500 });
   }
}
