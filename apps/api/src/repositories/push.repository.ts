import { prisma } from "../lib/prisma";

// Only place that touches the PushSubscription table (CLAUDE.md §3).

export interface UpsertPushData {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export const pushRepository = {
  /**
   * Register (or refresh) a browser's push subscription. Keyed on `endpoint`,
   * which is globally unique per browser: if the same endpoint re-subscribes —
   * possibly now belonging to a different signed-in user on a shared device —
   * we re-point it at the current user and update its crypto keys.
   */
  upsert(data: UpsertPushData) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        userId: data.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
      update: {
        userId: data.userId,
        p256dh: data.p256dh,
        auth: data.auth,
      },
    });
  },

  /** All live subscriptions for a user — the fan-out targets for a push. */
  listByUserId(userId: string) {
    return prisma.pushSubscription.findMany({ where: { userId } });
  },

  /**
   * Remove a subscription by endpoint, scoped to its owner so one user can't
   * delete another's. `deleteMany` (not `delete`) keeps it idempotent — an
   * already-gone subscription affects zero rows instead of throwing.
   */
  async deleteByEndpoint(endpoint: string, userId: string): Promise<number> {
    const { count } = await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });
    return count;
  },

  /** Prune a dead subscription (endpoint returned 404/410 from the push service). */
  async deleteById(id: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({ where: { id } });
  },
};
