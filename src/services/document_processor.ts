// Use require for pdf-parse to avoid TS typing issues if @types/pdf-parse is missing
const pdfParse = require("pdf-parse");

/**
 * Extracts plain text from a buffer containing either PDF or UTF-8 text.
 */
export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  const normalizedType = fileType.toLowerCase();
  
  if (normalizedType.includes("pdf") || normalizedType === "application/pdf") {
    try {
      const data = await pdfParse(buffer);
      return data.text || "";
    } catch (error) {
      console.error("❌ Error parsing PDF buffer:", error);
      throw new Error(`Failed to parse PDF document: ${(error as Error).message}`);
    }
  }

  // Fallback to plain text decoding
  try {
    return buffer.toString("utf-8");
  } catch (error) {
    console.error("❌ Error parsing text buffer:", error);
    throw new Error("Failed to decode text document (invalid UTF-8 sequence)");
  }
}

/**
 * Chunks text dynamically, attempting to break on natural boundaries (like paragraph or sentence limits)
 * without cutting words in half. Uses a sliding window with overlap.
 */
export function chunkText(
  text: string,
  chunkSize: number = 800,
  chunkOverlap: number = 150
): string[] {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  if (normalizedText.length <= chunkSize) {
    return [normalizedText];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < normalizedText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < normalizedText.length) {
      // Find a clean boundary (e.g. spaces, periods, or question marks) to break on
      const subWindow = normalizedText.slice(startIndex, endIndex);
      
      // Look for a period or sentence end in the last 20% of the chunk
      const searchStart = Math.floor(chunkSize * 0.8);
      const sentenceBoundary = subWindow.lastIndexOf(". ", searchStart);
      
      if (sentenceBoundary !== -1 && sentenceBoundary > searchStart / 2) {
        endIndex = startIndex + sentenceBoundary + 1; // include the period
      } else {
        // Fallback to space boundary
        const spaceBoundary = subWindow.lastIndexOf(" ");
        if (spaceBoundary !== -1 && spaceBoundary > searchStart / 2) {
          endIndex = startIndex + spaceBoundary;
        }
      }
    }

    const chunk = normalizedText.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    startIndex = endIndex - chunkOverlap;

    // Prevent infinite loop if index isn't progressing
    if (chunkSize <= chunkOverlap) {
      startIndex = endIndex;
    }
  }

  return chunks;
}
