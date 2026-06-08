import { redis } from "../lib/redis";

// Server-side authority for refresh-token validity. Refresh tokens are tracked
// ONLY here in Redis (never in Postgres) per the auth spec. We store a whitelist
// of live token ids (`jti`), not the tokens themselves — the JWT signature is the
// secret, so Redis holding a jti → userId mapping is enough to:
//   • rotate   — delete the old jti, register the new one, on every refresh
//   • revoke   — delete one jti on logout
//   • revokeAll— delete every jti for a user (password change / reuse response)
//   • detect reuse — a validly-signed jti that is absent was already rotated away
//
// Keys are internal and never surfaced to clients (security rule). A per-user SET
// indexes a user's live jtis so revoke-all is O(n) without a key scan.

const tokenKey = (jti: string) => `auth:refresh:${jti}`;
const userSetKey = (userId: string) => `auth:refresh:user:${userId}`;

export const refreshTokenStore = {
  /** Whitelist a freshly-issued refresh token id, expiring exactly with the JWT. */
  async save(jti: string, userId: string, ttlSeconds: number): Promise<void> {
    await redis
      .multi()
      .set(tokenKey(jti), userId, "EX", ttlSeconds)
      .sadd(userSetKey(userId), jti)
      // Keep the index alive at least as long as the longest-lived token in it.
      .expire(userSetKey(userId), ttlSeconds)
      .exec();
  },

  /** Resolve a token id to its owner, or null if it is unknown/expired/revoked. */
  async getUserId(jti: string): Promise<string | null> {
    return redis.get(tokenKey(jti));
  },

  /** Revoke a single token id (logout / rotation of the old token). */
  async revoke(userId: string, jti: string): Promise<void> {
    await redis.multi().del(tokenKey(jti)).srem(userSetKey(userId), jti).exec();
  },

  /** Revoke every live session for a user (reuse detected, account recovery, etc.). */
  async revokeAllForUser(userId: string): Promise<void> {
    const jtis = await redis.smembers(userSetKey(userId));
    const pipeline = redis.multi();
    for (const jti of jtis) {
      pipeline.del(tokenKey(jti));
    }
    pipeline.del(userSetKey(userId));
    await pipeline.exec();
  },

  /**
   * Revoke every live session for a user EXCEPT one (the caller's current jti).
   * Used on an authenticated password change so other devices are logged out
   * while the device making the change stays signed in. When `keepJti` is
   * undefined (no valid current session), this degrades to revoking everything.
   */
  async revokeAllForUserExcept(userId: string, keepJti: string | undefined): Promise<void> {
    const jtis = await redis.smembers(userSetKey(userId));
    const pipeline = redis.multi();
    for (const jti of jtis) {
      if (jti === keepJti) continue;
      pipeline.del(tokenKey(jti));
      pipeline.srem(userSetKey(userId), jti);
    }
    await pipeline.exec();
  },
};
