import { Request, Response, NextFunction } from "express";
import { pool } from "../models/db";

// Fallback Messages
export const SAFETY_FALLBACKS = {
  PROMPT_INJECTION: "⚠️ Safety Alert: The query was blocked because it triggered our prompt injection guardrails.",
  OUT_OF_SCOPE: "I'm sorry, but that question is out of scope. I can only answer questions based on the uploaded documents in your tenant knowledge base.",
  LOW_CONFIDENCE: "I couldn't find any high-confidence information in your uploaded documents to answer this question. Please make sure the relevant documentation is uploaded.",
  TENANT_NOT_FOUND: "Authentication Error: The requested Tenant ID does not exist. Access denied."
};

// Common prompt injection attack patterns
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?instructions/i,
  /ignore\s+(?:the\s+)?above/i,
  /forget\s+(?:what\s+)?(?:you\s+)?(?:were\s+)?told/i,
  /forget\s+(?:all\s+)?instructions/i,
  /system\s+prompt\s+override/i,
  /bypass\s+restrictions/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /ignore\s+(?:the\s+)?system\s+instruction/i,
  /override\s+system/i,
  /forget\s+rules/i,
  /act\s+as\s+a\s+developer/i,
  /output\s+(?:the\s+)?system\s+prompt/i,
  /reveal\s+(?:your\s+)?system/i,
  /ignore\s+safety/i
];

/**
 * Validates whether the user query contains prompt injection attempts.
 * Returns true if an injection attempt is detected.
 */
export function detectPromptInjection(query: string): boolean {
  if (!query) return false;
  return PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(query));
}

/**
 * Evaluates semantic retrieval matches to ensure a confidence score threshold is met.
 * We calculate the similarity score.
 * If the highest score is below 0.35 (cosine similarity), return false.
 */
export function isRetrievalConfidenceHigh(
  matches: { similarity: number }[],
  minSimilarity: number = 0.38
): boolean {
  if (!matches || matches.length === 0) return false;
  const bestMatch = matches[0];
  return bestMatch.similarity >= minSimilarity;
}

/**
 * Express middleware to validate tenant existence and enforce strict isolation.
 * Ensures the tenantId parameter is a valid UUID and exists in our database.
 */
export async function validateTenant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const tenantId = req.params.tenantId as string;

  if (!tenantId) {
    res.status(400).json({
      error: "Missing required Tenant ID in request URL parameters."
    });
    return;
  }

  // UUID Format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    res.status(400).json({
      error: "Invalid Tenant ID format. Must be a valid UUID v4."
    });
    return;
  }

  try {
    const checkResult = await pool.query(
      "SELECT id, name FROM tenants WHERE id = $1",
      [tenantId]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({
        error: SAFETY_FALLBACKS.TENANT_NOT_FOUND
      });
      return;
    }

    // Attach active tenant info to response locals for controller use
    res.locals.tenant = checkResult.rows[0];
    next();
  } catch (error) {
    console.error("❌ Tenant validation middleware error:", error);
    res.status(500).json({
      error: "Internal server error performing tenant authorization."
    });
  }
}
