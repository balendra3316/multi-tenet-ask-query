import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./models/db";
import { initializeDatabase } from "./models/db_init";
import tenantRouter from "./api/routes";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend assets from public directory
app.use(express.static(path.join(__dirname, "../public")));

// Register all Multi-Tenant RAG API routes
app.use("/", tenantRouter);

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

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Unhandled Express Error:", err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

// Self-initializing server on startup
async function startServer() {
  try {
    // 1. Initialize schema and extensions
    await initializeDatabase();

    // 2. Start listening
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
