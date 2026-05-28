import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./models/db";
import { initializeDatabase } from "./models/db_init";
import tenantRouter from "./api/routes";
import path from "path";
import { corsOptions } from "./config";
import { requestLogger, errorHandler, notFoundHandler, apiLimiter } from "./middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Request logging middleware
app.use(requestLogger);

// 2. Production-ready CORS integration
app.use(cors(corsOptions));

// 3. Built-in body parsers
app.use(express.json());

// 4. Rate Limiter for all routes to prevent resource abuse
app.use(apiLimiter);

// Serve static frontend assets from public directory
app.use(express.static(path.join(__dirname, "../public")));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "healthy", database: "connected" });
  } catch (error) {
    res
      .status(500)
      .json({ status: "unhealthy", error: "Database unreachable" });
  }
});

// Register all Multi-Tenant RAG API routes
app.use("/", tenantRouter);

// 5. 404 Route Not Found Handler
app.use(notFoundHandler);

// 6. Global Error Handler
app.use(errorHandler);

// Self-initializing server on startup
async function startServer() {
  try {
    // Initialize schema and extensions
    await initializeDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(
        `🚀 Multi-Tenant RAG Backend & Frontend running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("❌ Critical failure during server startup:", error);
    process.exit(1);
  }
}

startServer();
