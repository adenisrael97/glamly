import multer, { type FileFilterCallback } from "multer";
import { Request } from "express";
import { ValidationError } from "../errors/AppError";

// Multer middleware for multipart/form-data file uploads. We use memory storage
// so the Buffer is piped directly to Cloudinary — no temp files on disk.
//
// Two size limits because portfolio images are larger than avatars:
//   • avatar:    5 MB  — profile photos are displayed small; 5 MB is generous
//   • portfolio: 10 MB — full-resolution showcase images

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError("Only JPEG, PNG, or WebP images are accepted"));
  }
}

/** Upload middleware for avatar images (5 MB limit, single file on field "file"). */
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter,
}).single("file");

/** Upload middleware for portfolio images (10 MB limit, single file on field "file"). */
export const uploadPortfolio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter,
}).single("file");
