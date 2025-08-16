import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";

// Extend the Request interface locally
interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

@Injectable()
export class FirebaseSessionGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    
    // Check for session cookie in cookies (browser requests)
    let sessionCookie = req.cookies?.["fb_session"];
    
    // If not found in cookies, check Cookie header (server action requests)
    if (!sessionCookie) {
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie: string) => {
          const [key, value] = cookie.trim().split('=');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {});
        sessionCookie = cookies["fb_session"];
      }
    }

    if (!sessionCookie) {
      console.log("❌ No session cookie found");
      throw new UnauthorizedException("No session cookie found");
    }

    try {
      console.log("🔄 Verifying Firebase session cookie...");
      
      // Import Firebase Admin dynamically to avoid circular dependencies
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();
      
      // Verify the session cookie with revocation checks enabled
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      
      console.log("✅ Session cookie verified for user:", decoded.uid);
      
      // Attach user info to request for use in controllers
      req.user = decoded as DecodedIdToken;
      
      return true;
    } catch (error) {
      console.error("❌ Invalid session cookie:", error);
      throw new UnauthorizedException("Invalid session cookie");
    }
  }
}
