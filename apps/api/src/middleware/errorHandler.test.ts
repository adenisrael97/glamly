import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// Mock the side-effecting deps so the test asserts on intent, not output.
vi.mock("../lib/sentry", () => ({ captureException: vi.fn() }));
vi.mock("../lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { errorHandler } from "./errorHandler";
import { captureException } from "../lib/sentry";
import { AppError } from "../errors/AppError";

interface CapturedRes extends Response {
  _status?: number;
  _body?: { success: boolean; message: string; error: { code: string; message: string } };
}

function mockRes(): CapturedRes {
  const res = {} as CapturedRes;
  res.status = vi.fn((code: number) => {
    res._status = code;
    return res;
  }) as unknown as Response["status"];
  res.json = vi.fn((body: CapturedRes["_body"]) => {
    res._body = body;
    return res;
  }) as unknown as Response["json"];
  return res;
}

const req = {
  headers: { "x-request-id": "corr-123" },
  path: "/things",
  method: "GET",
} as unknown as Request;

const next = vi.fn() as unknown as NextFunction;

beforeEach(() => vi.clearAllMocks());

describe("errorHandler", () => {
  it("returns the AppError envelope and does NOT report operational errors to Sentry", () => {
    const res = mockRes();
    errorHandler(new AppError("bad input", 400, "VALIDATION_ERROR"), req, res, next);

    expect(res._status).toBe(400);
    expect(res._body?.error.code).toBe("VALIDATION_ERROR");
    expect(captureException).not.toHaveBeenCalled();
  });

  it("reports unexpected errors to Sentry tagged with the correlation id, behind a generic 500", () => {
    const res = mockRes();
    const err = new Error("boom");
    errorHandler(err, req, res, next);

    expect(res._status).toBe(500);
    expect(res._body?.error.code).toBe("INTERNAL_ERROR");
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(err, { correlationId: "corr-123" });
  });

  it("treats a non-operational AppError as unexpected and reports it", () => {
    const res = mockRes();
    errorHandler(new AppError("a bug", 500, "INTERNAL_ERROR", false), req, res, next);

    expect(res._status).toBe(500);
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});
