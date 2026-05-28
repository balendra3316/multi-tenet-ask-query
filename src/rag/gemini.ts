import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("CRITICAL: GEMINI_API_KEY is not defined in the environment variables!");
}

// Initialize the Google Gen AI SDK
export const ai = new GoogleGenAI({ apiKey });

/**
 * Generates vector embedding for the input text using 'gemini-embedding-2'.
 * Returns a 768-dimensional number array.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const cleanedText = text.replace(/\r?\n|\r/g, " ").trim();
    if (!cleanedText) {
      throw new Error("Text content cannot be empty for embedding generation.");
    }

    const response = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: cleanedText,
    });

    const res = response as any;

    if (res.embedding?.values) {
      return res.embedding.values;
    }

    // Secondary fallback checks for legacy structures
    const alternativeValues =
      res.embeddings?.[0]?.values || res.embeddings?.values || res.embedding?.values;
    if (alternativeValues) {
      return alternativeValues;
    }

    throw new Error("Failed to extract embedding values from Gemini API response.");
  } catch (error) {
    console.error("❌ Error generating embedding with gemini-embedding-2:", error);
    throw error;
  }
}

/**
 * Generates completion using 'gemini-2.5-flash' based on retrieval context and the question.
 */
export async function generateCompletion(
  context: string,
  question: string
): Promise<string> {
  try {
    const systemInstruction = `You are a professional RAG assistant.
Strict rules:
1. You MUST answer the user's question using ONLY the provided text segments in the context.
2. Do not use external or outside knowledge.
3. If the answer cannot be found in the context, state: "I cannot find reliable information answering this in your knowledge base."
4. Maintain high factual accuracy and avoid hallucinations.`;

    const contents = `Context from Knowledge Base:
${context}

User Question: ${question}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.1, // low temperature for precise, fact-based synthesis
      },
    });

    return response.text?.trim() || "No response text generated.";
  } catch (error) {
    console.error("❌ Error generating completion with gemini-2.5-flash:", error);
    throw error;
  }
}
