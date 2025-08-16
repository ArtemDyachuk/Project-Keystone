import type { DecodedIdToken } from "firebase-admin/auth";

declare module "express" {
   interface Request {
      user?: DecodedIdToken;
   }
}

export { };
