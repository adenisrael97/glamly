import { Request, Response } from "express";
import type {
  ApproveStylistInput,
  ListAdminStylistsQuery,
  ListAdminUsersQuery,
  ListAdminBookingsQuery,
  ChangeUserRoleInput,
} from "@glamly/shared";
import { adminService } from "../services/admin.service";
import { asyncHandler } from "../middleware/asyncHandler";
import { sendSuccess } from "../lib/apiResponse";

const ipOf = (req: Request) =>
  (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
  req.socket?.remoteAddress;

export const adminController = {
  // ─── Analytics ──────────────────────────────────────────────────────────────

  getAnalytics: asyncHandler(async (req: Request, res: Response) => {
    const data = await adminService.getAnalytics();
    sendSuccess(res, data, "Analytics retrieved successfully");
  }),

  // ─── Stylists ───────────────────────────────────────────────────────────────

  listStylists: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.listStylists(req.query as ListAdminStylistsQuery);
    sendSuccess(res, result, "Stylists retrieved successfully");
  }),

  getStylistById: asyncHandler(async (req: Request, res: Response) => {
    const stylist = await adminService.getStylistById(req.params.id);
    sendSuccess(res, stylist, "Stylist retrieved successfully");
  }),

  updateStylistStatus: asyncHandler(async (req: Request, res: Response) => {
    const updated = await adminService.updateStylistStatus(
      req.user!.id,
      req.params.id,
      req.body as ApproveStylistInput,
      ipOf(req),
    );
    sendSuccess(res, updated, "Stylist status updated");
  }),

  getPendingCount: asyncHandler(async (_req: Request, res: Response) => {
    const count = await adminService.countPendingStylists();
    sendSuccess(res, { count }, "Pending count retrieved");
  }),

  // ─── Users ──────────────────────────────────────────────────────────────────

  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.listUsers(req.query as ListAdminUsersQuery);
    sendSuccess(res, result, "Users retrieved successfully");
  }),

  getUserById: asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.getUserById(req.params.id);
    sendSuccess(res, user, "User retrieved successfully");
  }),

  changeUserRole: asyncHandler(async (req: Request, res: Response) => {
    const updated = await adminService.changeUserRole(
      req.user!.id,
      req.params.id,
      req.body as ChangeUserRoleInput,
      ipOf(req),
    );
    sendSuccess(res, updated, "User role updated");
  }),

  softDeleteUser: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.softDeleteUser(req.user!.id, req.params.id, ipOf(req));
    sendSuccess(res, result, "User deleted");
  }),

  // ─── Bookings ───────────────────────────────────────────────────────────────

  listBookings: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.listBookings(req.query as ListAdminBookingsQuery);
    sendSuccess(res, result, "Bookings retrieved successfully");
  }),

  getBookingById: asyncHandler(async (req: Request, res: Response) => {
    const booking = await adminService.getBookingById(req.params.id);
    sendSuccess(res, booking, "Booking retrieved successfully");
  }),

  // ─── Services ───────────────────────────────────────────────────────────────

  listAllServices: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await adminService.listAllServices(page, limit);
    sendSuccess(res, result, "Services retrieved successfully");
  }),

  deactivateService: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.deactivateService(req.params.id);
    sendSuccess(res, result, "Service deactivated");
  }),
};
