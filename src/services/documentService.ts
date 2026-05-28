import { pool } from "../models/db";
import { chunkText } from "../rag/chunker";
import { generateEmbedding } from "../rag/gemini";
import { saveChunks } from "../rag/vectorStore";
import { PDFParse } from "pdf-parse";

interface ProcessedDocumentResult {
  documentId: string;
  filename: string;
  chunksCount: number;
}

/**
 * Extracts plain text from a buffer based on the file's mime-type or name.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const normalizedMime = mimeType.toLowerCase();
  const normalizedName = filename.toLowerCase();

  if (
    normalizedMime === "application/pdf" ||
    normalizedName.endsWith(".pdf")
  ) {
    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      return result.text || "";
    } catch (error) {
      console.error("❌ Failed to parse PDF file:", error);
      throw new Error(`PDF parsing error: ${(error as Error).message}`);
    }
  }

  // Default fallback to UTF-8 string decoding (txt, json, markdown, csv, etc.)
  try {
    return buffer.toString("utf-8");
  } catch (error) {
    console.error("❌ Failed to decode text file buffer:", error);
    throw new Error("Text decoding error: File is not a valid UTF-8 sequence.");
  }
}

/**
 * Handles the complete document ingestion pipeline:
 * 1. Text extraction from buffer
 * 2. Semantic text chunking
 * 3. Embedding generation per chunk via Gemini
 * 4. ACID-compliant transaction insertion into documents & document_chunks tables.
 */
export async function processAndIndexDocument(
  tenantId: string,
  filename: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<ProcessedDocumentResult> {
  // 1. Extract text content
  const extractedText = await extractTextFromBuffer(fileBuffer, mimeType, filename);
  const trimmedText = extractedText.trim();

  if (!trimmedText) {
    throw new Error("Document text content is empty or contains no readable characters.");
  }

  // 2. Split text into chunks
  const chunks = chunkText(trimmedText, 500, 100);
  if (chunks.length === 0) {
    throw new Error("Text chunking failed. Could not generate chunks from document.");
  }

  // 3. Generate embeddings for chunks
  const embeddings: number[][] = [];
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk);
    embeddings.push(embedding);
  }

  // 4. Perform database transaction
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // A. Insert base document
    const docQuery = `
      INSERT INTO documents (tenant_id, name, file_type, text_content)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const docResult = await client.query(docQuery, [
      tenantId,
      filename,
      mimeType,
      trimmedText
    ]);
    const documentId = docResult.rows[0].id;

    // B. Save document chunks with embeddings using same transaction client
    await saveChunks(tenantId, documentId, chunks, embeddings, client);

    await client.query("COMMIT");

    return {
      documentId,
      filename,
      chunksCount: chunks.length
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Transaction failed, rolled back changes:", error);
    throw error;
  } finally {
    client.release();
  }
}
