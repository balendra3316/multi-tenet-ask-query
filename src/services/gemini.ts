import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize the Google Gen AI SDK
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is not defined!");
}

const ai = new GoogleGenAI({ apiKey });

// Primary models configured for embeddings and content generation
const EMBEDDING_MODEL = "gemini-embedding-2"; // 768-dimensional multimodal/text embedding
const LLM_MODEL = "gemini-2.5-flash"; // Extremely fast and accurate generation model

/**
 * Generates vector embedding for the given input text.
 * Returns a 768-dimensional array of numbers.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const cleanText = text.replace(/\r?\n|\r/g, " ").trim();
    if (!cleanText) {
      throw new Error("Cannot generate embedding for empty text");
    }

    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: cleanText,
    });

    const res = response as any;

    if (res.embedding?.values) {
      return res.embedding.values;
    }

    // Secondary fallback check for older format properties
    const legacyValues = res.embeddings?.[0]?.values || res.embeddings?.values || res.embedding?.values;
    if (legacyValues) {
      return legacyValues;
    }

    throw new Error("Response did not contain valid embedding values");
  } catch (error) {
    console.error("❌ Error generating embedding via Gemini API:", error);
    // Graceful fallback attempt using gemini-embedding-001 if the primary model fails
    try {
      console.log("🔄 Attempting fallback embedding model (gemini-embedding-001)...");
      const fallbackResponse = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: text,
      });
      const fallbackRes = fallbackResponse as any;
      if (fallbackRes.embedding?.values) {
        return fallbackRes.embedding.values;
      }
      if (fallbackRes.embeddings?.[0]?.values) {
        return fallbackRes.embeddings[0].values;
      }
    } catch (fallbackErr) {
      console.error("❌ Fallback embedding model also failed:", fallbackErr);
    }
    throw error;
  }
}

/**
 * Generates an answer from the Gemini LLM based on the system instruction and user prompt.
 */
export async function generateAnswer(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: LLM_MODEL,
      contents: prompt,
      config: systemInstruction
        ? {
            systemInstruction,
            temperature: 0.1, // low temperature to ensure strict adherence to provided facts
          }
        : {
            temperature: 0.1,
          },
    });

    return response.text?.trim() || "No response text generated.";
  } catch (error) {
    console.error("❌ Error generating content via Gemini LLM:", error);
    throw error;
  }
}
