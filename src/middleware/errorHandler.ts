import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { logger } from "../utils/logger";
import { ERROR_CODES, HTTP_STATUS } from "../config/constants";

/**
 * Global error handling middleware
 * Handles all errors thrown in the application
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log the error
  logger.error(`${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Invalid resource ID format";
    error = ApiError.badRequest(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const message = `Duplicate value for field: ${field}`;
    error = ApiError.badRequest(message);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors || {}).map((el: any) => el.message);
    const message = `Validation failed: ${errors.join(", ")}`;
    error = ApiError.badRequest(message, errors);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = ApiError.unauthorized("Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    error = ApiError.unauthorized("Token expired");
  }

  // Default to 500 server error
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const code = error.code || ERROR_CODES.INTERNAL_ERROR;
  const message = error.isOperational ? error.message : "Internal server error";

  // Don't leak error details in production
  const details =
    process.env.NODE_ENV === "development"
      ? { ...error.details, stack: err.stack, originalError: err.message }
      : error.details;

  res.status(statusCode).json(ApiResponse.error(message, code, details));
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const message = `Route ${req.originalUrl} not found`;
  res
    .status(HTTP_STATUS.NOT_FOUND)
    .json(ApiResponse.error(message, ERROR_CODES.NOT_FOUND));
};

/**
 * Async handler wrapper to catch async errors
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => any) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
