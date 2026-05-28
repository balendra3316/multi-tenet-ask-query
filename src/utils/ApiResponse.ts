import { Response } from "express";
import { HTTP_STATUS } from "../config/constants";

/**
 * Standard API response wrapper
 */
export class ApiResponse {
  /**
   * Create a success response
   */
  static success(data: any, message: string = "Success", meta: any = null) {
    const response: any = {
      success: true,
      message,
      data,
    };

    if (meta) {
      response.meta = meta;
    }

    return response;
  }

  /**
   * Create an error response
   */
  static error(message: string, code: string, details: any = null) {
    const response: any = {
      success: false,
      error: {
        code,
        message,
      },
    };

    if (details) {
      response.error.details = details;
    }

    return response;
  }

  /**
   * Create a paginated response
   */
  static paginated(data: any[], page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    };
  }
}

/**
 * Send success response helper
 */
export const sendSuccess = (
  res: Response,
  data: any,
  message: string = "Success",
  statusCode: number = HTTP_STATUS.OK
) => {
  return res.status(statusCode).json(ApiResponse.success(data, message));
};

/**
 * Send created response helper
 */
export const sendCreated = (
  res: Response,
  data: any,
  message: string = "Created successfully"
) => {
  return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success(data, message));
};

/**
 * Send no content response helper
 */
export const sendNoContent = (res: Response) => {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

export default ApiResponse;
