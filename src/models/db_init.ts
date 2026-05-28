import { pool } from "./db";

// Global feature flag to handle database fallback dynamically
export let isPgVectorAvailable = true;

export async function initializeDatabase() {
  console.log("🔄 Initializing database schema...");
  const client = await pool.connect();
  
  try {
    // 1. Detect if pgvector extension is available/supported on the PostgreSQL server
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
      await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
      isPgVectorAvailable = true;
      console.log("✅ pgvector extension enabled and active.");
    } catch (vectorErr) {
      isPgVectorAvailable = false;
      console.warn(
        "⚠️ Warning: pgvector extension is not installed/available on your PostgreSQL server.\n" +
        "💡 Falling back to native PostgreSQL real[] array storage for semantic embeddings! System remains fully operational."
      );
    }

    // 2. Create Tenants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50),
        text_content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create Document Chunks table (with dynamic data-type)
    const embeddingColType = isPgVectorAvailable ? "vector(768)" : "real[]";
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        chunk_index INT NOT NULL,
        content TEXT NOT NULL,
        embedding ${embeddingColType} NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create performance & isolation indexes
    await client.query("CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);");
    await client.query("CREATE INDEX IF NOT EXISTS idx_chunks_tenant ON document_chunks(tenant_id);");
    
    // 6. Vector search indexes (only created if pgvector is active)
    if (isPgVectorAvailable) {
      try {
        await client.query("CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);");
      } catch (hnswErr) {
        console.warn("⚠️ HNSW index creation skipped:", (hnswErr as Error).message);
        try {
          await client.query("CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivfflat ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);");
        } catch (ivfErr) {
          console.warn("⚠️ IVFFlat index creation skipped:", (ivfErr as Error).message);
        }
      }
    } else {
      console.log("ℹ️ Native array vector search utilizes in-memory cosine indices for maximum performance.");
    }

    console.log(`🚀 Database schema initialized successfully! Mode: ${isPgVectorAvailable ? "pgvector" : "native real[] fallback"}`);
  } catch (error) {
    console.error("❌ Database initialization failure:", error);
    throw error;
  } finally {
    client.release();
  }
}
