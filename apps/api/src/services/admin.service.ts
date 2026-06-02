import { StylistStatus } from "@prisma/client";
import {
  PAGINATION_DEFAULT_PAGE_SIZE,
  PAGINATION_MAX_PAGE_SIZE,
  type ApproveStylistInput,
  type ListAdminStylistsQuery,
  type ListAdminUsersQuery,
  type ListAdminBookingsQuery,
  type ChangeUserRoleInput,
} from "@glamly/shared";
import { adminRepository } from "../repositories/admin.repository";
import { auditRepository } from "../repositories/audit.repository";
import { ForbiddenError, NotFoundError } from "../errors/AppError";
import { notificationsService } from "./notifications.service";
import { emitStylistStatusChanged } from "../realtime/io";

function clamp(page?: number, limit?: number) {
  return {
    page: Math.max(1, page ?? 1),
    limit: Math.min(Math.max(1, limit ?? PAGINATION_DEFAULT_PAGE_SIZE), PAGINATION_MAX_PAGE_SIZE),
  };
}

export const adminService = {
  // ─── Stylists ────────────────────────────────────────────────────────────────

  async listStylists(query: ListAdminStylistsQuery) {
    const { page, limit } = clamp(query.page, query.limit);
    const { items, total } = await adminRepository.listStylists({
      page,
      limit,
      status: query.status as StylistStatus | undefined,
      search: query.search,
    });
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getStylistById(id: string) {
    const stylist = await adminRepository.findStylistById(id);
    if (!stylist) throw new NotFoundError("Stylist not found");
    return stylist;
  },

  async updateStylistStatus(
    actorId: string,
    stylistId: string,
    input: ApproveStylistInput,
    ipAddress?: string,
  ) {
    const stylist = await adminRepository.findStylistById(stylistId);
    if (!stylist) throw new NotFoundError("Stylist not found");

    const newStatus = input.status as StylistStatus;
    const isApproving = newStatus === StylistStatus.APPROVED;

    const updated = await adminRepository.updateStylistStatus({
      id: stylistId,
      status: newStatus,
      approvedById: isApproving ? actorId : undefined,
      approvedAt: isApproving ? new Date() : undefined,
    });

    await auditRepository.record({
      userId: actorId,
      action: `STYLIST_STATUS_CHANGED`,
      entityType: "Stylist",
      entityId: stylistId,
      metadata: {
        from: stylist.status,
        to: newStatus,
        ...(input.reason ? { reason: input.reason } : {}),
      },
      ipAddress,
    });

    // Real-time notification to the stylist's user room.
    emitStylistStatusChanged(stylist.user.id, { status: newStatus, reason: input.reason });

    // Fire-and-forget: send approval/rejection email (fails-soft if Resend is absent).
    void notificationsService.sendStylistStatusEmail(stylist.user.email, stylist.user.name, newStatus, input.reason);

    return updated;
  },

  async countPendingStylists() {
    return adminRepository.countPendingStylists();
  },

  // ─── Users ───────────────────────────────────────────────────────────────────

  async listUsers(query: ListAdminUsersQuery) {
    const { page, limit } = clamp(query.page, query.limit);
    const { items, total } = await adminRepository.listUsers({
      page,
      limit,
      search: query.search,
      role: query.role as "USER" | "STYLIST" | "ADMIN" | undefined,
    });
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getUserById(id: string) {
    const user = await adminRepository.findUserById(id);
    if (!user) throw new NotFoundError("User not found");
    return user;
  },

  async changeUserRole(
    actorId: string,
    targetUserId: string,
    input: ChangeUserRoleInput,
    ipAddress?: string,
  ) {
    if (actorId === targetUserId) {
      throw new ForbiddenError("You cannot change your own role");
    }
    const user = await adminRepository.findUserById(targetUserId);
    if (!user) throw new NotFoundError("User not found");

    const updated = await adminRepository.updateUserRole(targetUserId, input.role as "USER" | "STYLIST" | "ADMIN");

    await auditRepository.record({
      userId: actorId,
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      entityId: targetUserId,
      metadata: { from: user.role, to: input.role },
      ipAddress,
    });

    return updated;
  },

  async softDeleteUser(actorId: string, targetUserId: string, ipAddress?: string) {
    if (actorId === targetUserId) {
      throw new ForbiddenError("You cannot delete your own account via admin");
    }
    const user = await adminRepository.findUserById(targetUserId);
    if (!user) throw new NotFoundError("User not found");

    const updated = await adminRepository.softDeleteUser(targetUserId);

    await auditRepository.record({
      userId: actorId,
      action: "USER_SOFT_DELETED",
      entityType: "User",
      entityId: targetUserId,
      ipAddress,
    });

    return updated;
  },

  // ─── Bookings ─────────────────────────────────────────────────────────────────

  async listBookings(query: ListAdminBookingsQuery) {
    const { page, limit } = clamp(query.page, query.limit);
    const { items, total } = await adminRepository.listBookings({
      page,
      limit,
      status: query.status as "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | undefined,
      stylistId: query.stylistId,
      userId: query.userId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getBookingById(id: string) {
    const booking = await adminRepository.findBookingById(id);
    if (!booking) throw new NotFoundError("Booking not found");
    return booking;
  },

  // ─── Analytics ──────────────────────────────────────────────────────────────

  async getAnalytics() {
    const [analytics, recentBookings] = await Promise.all([
      adminRepository.getAnalytics(),
      adminRepository.getRecentBookings(10),
    ]);
    return { ...analytics, recentBookings };
  },

  // ─── Services ─────────────────────────────────────────────────────────────────

  async listAllServices(page: number, limit: number) {
    const p = Math.max(1, page);
    const l = Math.min(Math.max(1, limit), PAGINATION_MAX_PAGE_SIZE);
    const { items, total } = await adminRepository.listAllServices({ page: p, limit: l });
    return { items, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async deactivateService(id: string) {
    return adminRepository.deactivateService(id);
  },
};
