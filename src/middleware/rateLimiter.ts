import { Request, Response, NextFunction } from "express";

const rateLimitWindowMs = 5 * 60 * 1000; // 5 minutes
const rateLimitMax = 500;

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

// In-memory registry to track request rates by client IP
const requestCounts = new Map<string, RateLimitInfo>();

/**
 * Standard API rate limiter middleware.
 * Enforces a limit of 500 requests per 5 minutes per client IP.
 */
export const apiLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const ip = req.ip || "unknown";
  const now = Date.now();

  let info = requestCounts.get(ip);

  // If no entry exists or window has expired, reset tracker
  if (!info || now > info.resetTime) {
    info = {
      count: 0,
      resetTime: now + rateLimitWindowMs,
    };
  }

  info.count++;
  requestCounts.set(ip, info);

  if (info.count > rateLimitMax) {
    res.status(429).json({
      message: "Too many requests, please try again after 5 minutes.",
      status: 429,
    });
    return;
  }

  next();
};
