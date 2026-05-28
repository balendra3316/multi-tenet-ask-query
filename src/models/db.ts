import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection stability on server initialization
pool
  .query("SELECT NOW()")
  .then(() =>
    console.log(
      "✅ Connected to Local PostgreSQL Database with pgvector successfully.",
    ),
  )
  .catch((err) => console.error("❌ Database connection failure:", err));
