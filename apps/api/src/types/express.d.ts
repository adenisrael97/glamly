import { Role } from "@glamly/shared";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        // Canonical UPPERCASE role from the access token (matches the Prisma enum).
        role: Role;
      };
      correlationId?: string;
      // Raw request body bytes, stashed by express.json's `verify` hook. Needed
      // to verify the Paystack webhook HMAC against the exact bytes received —
      // re-serialising the parsed JSON would change whitespace/key order.
      rawBody?: Buffer;
    }
  }
}

export {};
