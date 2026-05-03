// functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config(); // Load .env at the very top

admin.initializeApp();

// Initialize OpenAI once
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("Missing OpenAI API key in .env");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface AIRequest {
  message: string;
}

interface AIResponse {
  success: boolean;
  reply: string;
}

export const chatWithLawyerAI = functions.https.onCall(
  async (request: functions.https.CallableRequest<AIRequest>): Promise<AIResponse> => {
    console.log("=== AI FUNCTION CALLED ===");

    // 1️⃣ Check if user is authenticated
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }

    // 2️⃣ Validate input
    const { message } = request.data || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Message is required."
      );
    }

    try {
      // 3️⃣ Call OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful Kenyan lawyer AI assistant. Answer clearly about Kenyan law and legal procedures.",
          },
          {
            role: "user",
            content: message.trim(),
          },
        ],
      });

      const reply = completion.choices[0]?.message?.content || "No response generated";

      return { success: true, reply };
    } catch (error: any) {
      console.error("AI ERROR:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "AI error"
      );
    }
  }
);