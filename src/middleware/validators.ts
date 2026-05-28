// middlewares/validators.js
import { body, param, query } from "express-validator";

// ─── Auth Validators ─────────────────────────────────────────────────────────

/**
 * Validate Google login body
 * POST /api/auth/google
 * { idToken: string, referralCode?: string }
 */
export const paymentSuccessValidation = [
  body("email")
    .notEmpty()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("planName")
    .notEmpty()
    .withMessage("planName is required")
    .isString()
    .trim(),

  body("amount")
    .notEmpty()
    .withMessage("amount is required")
    .isFloat({ gt: 0 })
    .withMessage("amount must be a positive number"),

  body("referralId")
    .optional()
    .isMongoId()
    .withMessage("referralId must be a valid MongoDB ObjectId"),
];

/**
 * Validate attendance sync payload from ME-ACD Attendance server
 * POST /api/external/attendance-sync
 */
export const attendanceSyncValidation = [
  body("email")
    .notEmpty()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
];
