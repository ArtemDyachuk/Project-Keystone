import type { DecodedIdToken } from "firebase-admin/auth";

declare module "express" {
   interface Request {
      user?: DecodedIdToken;
      sessionCtx?: SessionData;
      sessionId?: string;
      tenantId?: string;
      tenantRoles?: string[]; // Exposed from session for easy access
      firebase?: {
         uid: string;
         tenant?: string;
      };
   }

   interface SessionData {
      uid: string;
      tenantId?: string;
      roles?: string[]; // Array of roles for multi-role support
      mfaStrongUntil?: number;
      firebaseTenantId?: string;
      firebaseUid?: string;
      issuedAt: number;
      lastSeen: number;
      deviceId?: string;
   }
}

export { };
