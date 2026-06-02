import { Request, Response } from "express";
import type {
  CancelBookingInput,
  CreateBookingInput,
  ListBookingsQuery,
  RescheduleBookingInput,
} from "@glamly/shared";
import { bookingsService } from "../services/bookings.service";
import { asyncHandler } from "../middleware/asyncHandler";
import { sendSuccess, sendCreated } from "../lib/apiResponse";
import { clientIp, requireActor } from "../lib/requestContext";

export const bookingsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const { booking, idempotentReplay } = await bookingsService.create(
      actor,
      req.body as CreateBookingInput,
      { ipAddress: clientIp(req) },
    );
    // A replayed idempotent create is a 200 (nothing new was created).
    if (idempotentReplay) {
      sendSuccess(res, booking, "Booking already exists");
      return;
    }
    sendCreated(res, booking, "Booking created successfully");
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const result = await bookingsService.listMine(actor, req.query as ListBookingsQuery);
    sendSuccess(res, result, "Bookings retrieved successfully");
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const booking = await bookingsService.getByIdForActor(actor, req.params.id);
    sendSuccess(res, booking, "Booking retrieved successfully");
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const booking = await bookingsService.cancel(actor, req.params.id, req.body as CancelBookingInput, {
      ipAddress: clientIp(req),
    });
    sendSuccess(res, booking, "Booking cancelled successfully");
  }),

  reschedule: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const booking = await bookingsService.reschedule(
      actor,
      req.params.id,
      req.body as RescheduleBookingInput,
      { ipAddress: clientIp(req) },
    );
    sendSuccess(res, booking, "Booking rescheduled successfully");
  }),

  complete: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const booking = await bookingsService.complete(actor, req.params.id, {
      ipAddress: clientIp(req),
    });
    sendSuccess(res, booking, "Booking marked as completed");
  }),
};
