import { Request, Response, NextFunction } from "express";
import { pool } from "../models/db";

/**
 * Middleware to check if a tenant exists in the database.
 * Supports finding tenant ID under path parameter 'tenantId' or 'id'.
 * Attaches the validated tenantId and tenant object to res.locals and req.body.
 */
export async function tenantCheck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const tenantId = (req.params.tenantId || req.params.id) as string;

  if (!tenantId) {
    res.status(400).json({ error: "Tenant ID is required." });
    return;
  }

  // Validate UUID v4 format to prevent database syntax errors
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    res.status(400).json({ error: "Invalid Tenant ID format. Must be a valid UUID." });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT id, name FROM tenants WHERE id = $1",
      [tenantId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: `Tenant with ID ${tenantId} not found.` });
      return;
    }

    const tenant = result.rows[0];

    // Attach to res.locals for Express request lifecycle
    res.locals.tenantId = tenant.id;
    res.locals.tenant = tenant;

    // Attach to req.body as per instructions, only if body exists
    if (req.body) {
      req.body.tenantId = tenant.id;
    }

    next();
  } catch (error) {
    console.error("❌ Error in tenantCheck middleware:", error);
    res.status(500).json({ error: "Internal server error validating tenant." });
  }
}
