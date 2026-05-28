import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";
import { ApiError } from "../utils/ApiError";

/**
 * Validation middleware
 * Validates request using express-validator and returns errors if any
 */
export const validate = (validations: ValidationChain[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Format validation errors
    const formattedErrors = errors.array().map((error: any) => ({
      field: error.path || "",
      message: error.msg || "",
      value: error.value !== undefined ? error.value : "",
    }));

    next(ApiError.badRequest("Validation failed", formattedErrors));
  };
};

export default validate;
