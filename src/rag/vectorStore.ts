import { pool } from "../models/db";
import { isPgVectorAvailable } from "../models/db_init";

/**
 * Saves document chunks and their associated embeddings into the database.
 * Handled within a client transaction block if called inside a service transaction.
 * Supports both pgvector enabled mode and standard real[] fallback.
 */
export async function saveChunks(
  tenantId: string,
  documentId: string,
  chunks: string[],
  embeddings: number[][],
  dbClient: any = pool
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error("Number of text chunks must match the number of embeddings.");
  }

  // Insert chunks synchronously to maintain order index
  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];
    const embedding = embeddings[i];

    if (isPgVectorAvailable) {
      await dbClient.query(
        `INSERT INTO document_chunks 
          (document_id, tenant_id, chunk_index, content, embedding) 
         VALUES ($1, $2, $3, $4, $5::vector)`,
        [documentId, tenantId, i, chunkContent, `[${embedding.join(",")}]`]
      );
    } else {
      await dbClient.query(
        `INSERT INTO document_chunks 
          (document_id, tenant_id, chunk_index, content, embedding) 
         VALUES ($1, $2, $3, $4, $5)`,
        [documentId, tenantId, i, chunkContent, embedding]
      );
    }
  }
}

/**
 * Computes Cosine Similarity between two numeric vectors in TypeScript.
 * Used as a fallback when pgvector is unavailable on the local database server.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA === 0 || normB === 0 ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface ChunkSimilarityMatch {
  id: string;
  document_id: string;
  document_name: string;
  content: string;
  similarity: number;
}

/**
 * Performs semantic similarity search on the document_chunks table.
 * Strictly filters by tenantId before performing sorting to guarantee tenant isolation.
 */
export async function similaritySearch(
  tenantId: string,
  queryEmbedding: number[],
  limit: number = 5
): Promise<ChunkSimilarityMatch[]> {
  try {
    if (isPgVectorAvailable) {
      // Direct SQL search using pgvector's cosine distance operator (<=>)
      // Note: Cosine distance = 1 - Cosine Similarity
      // Strict tenant_id filter is enforced to prevent tenant data leakage.
      const query = `
        SELECT 
          c.id, 
          c.document_id, 
          d.name as document_name, 
          c.content, 
          (1 - (c.embedding <=> $1::vector)) as similarity
        FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE c.tenant_id = $2
        ORDER BY c.embedding <=> $1::vector
        LIMIT $3
      `;

      const result = await pool.query(query, [
        `[${queryEmbedding.join(",")}]`,
        tenantId,
        limit
      ]);

      return result.rows.map((row) => ({
        id: row.id,
        document_id: row.document_id,
        document_name: row.document_name,
        content: row.content,
        similarity: Number(row.similarity)
      }));
    } else {
      // Fallback: Retrieve all chunks for this tenant and calculate similarities in Node.js
      const query = `
        SELECT 
          c.id, 
          c.document_id, 
          d.name as document_name, 
          c.content, 
          c.embedding
        FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE c.tenant_id = $1
      `;

      const result = await pool.query(query, [tenantId]);

      const matches: ChunkSimilarityMatch[] = result.rows.map((row) => {
        let vector = row.embedding;
        if (typeof vector === "string") {
          // Parse string array representations like '{0.1,0.2,...}' from pg response if needed
          vector = vector
            .replace(/{|}/g, "")
            .split(",")
            .map(Number);
        }
        
        const similarity = cosineSimilarity(queryEmbedding, vector);
        return {
          id: row.id,
          document_id: row.document_id,
          document_name: row.document_name,
          content: row.content,
          similarity
        };
      });

      // Sort descending by similarity score
      matches.sort((a, b) => b.similarity - a.similarity);
      return matches.slice(0, limit);
    }
  } catch (error) {
    console.error("❌ Similarity search database failure:", error);
    throw error;
  }
}
