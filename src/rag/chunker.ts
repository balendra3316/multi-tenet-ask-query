/**
 * Splits raw text string into semantic chunks of roughly 'chunkSize' characters
 * with a 'chunkOverlap' character overlap.
 * 
 * Attempts to preserve sentence boundaries (.!?) or word boundaries (spaces)
 * so content is not cut mid-word or mid-thought.
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  chunkOverlap: number = 100
): string[] {
  if (!text) return [];

  // Normalize consecutive whitespaces and tabs to single spaces
  const normalizedText = text.replace(/\s+/g, " ").trim();

  // If text is short, return it as a single chunk
  if (normalizedText.length <= chunkSize) {
    return [normalizedText];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < normalizedText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < normalizedText.length) {
      // Create a search window in the last 25% of the chunk to find clean boundaries
      const lookbackRange = Math.floor(chunkSize * 0.25);
      const subWindow = normalizedText.slice(endIndex - lookbackRange, endIndex);

      // Attempt 1: Find a sentence boundary (. ! ?)
      const sentenceBoundaryIndex = Math.max(
        subWindow.lastIndexOf(". "),
        subWindow.lastIndexOf("! "),
        subWindow.lastIndexOf("? ")
      );

      if (sentenceBoundaryIndex !== -1) {
        // Adjust endIndex to finish at sentence boundary (adding 1 to include the mark itself)
        endIndex = (endIndex - lookbackRange) + sentenceBoundaryIndex + 1;
      } else {
        // Attempt 2: Fall back to space boundary
        const spaceBoundaryIndex = subWindow.lastIndexOf(" ");
        if (spaceBoundaryIndex !== -1) {
          endIndex = (endIndex - lookbackRange) + spaceBoundaryIndex;
        }
      }
    }

    const chunk = normalizedText.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Slide the window back by overlap
    startIndex = endIndex - chunkOverlap;

    // Safety guardrail to avoid infinite loops in case overlap >= chunkSize
    if (chunkSize <= chunkOverlap) {
      startIndex = endIndex;
    }
  }

  return chunks;
}
