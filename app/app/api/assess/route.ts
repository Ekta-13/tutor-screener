import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const transcript = messages
      .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: [{
        role: "user",
        parts: [{ text: `You are evaluating a tutor candidate interview for Cuemath. Based on the transcript below, provide a structured assessment.

TRANSCRIPT:
${transcript}

Respond in this exact JSON format with no markdown or code blocks:
{
  "recommendation": "PROCEED" or "REJECT",
  "overallScore": <number 1-10>,
  "summary": "<2-3 sentence overall summary>",
  "dimensions": {
    "clarity": { "score": <1-10>, "comment": "<specific observation>", "quote": "<exact quote from candidate>" },
    "warmth": { "score": <1-10>, "comment": "<specific observation>", "quote": "<exact quote from candidate>" },
    "patience": { "score": <1-10>, "comment": "<specific observation>", "quote": "<exact quote from candidate>" },
    "simplicity": { "score": <1-10>, "comment": "<specific observation>", "quote": "<exact quote from candidate>" },
    "fluency": { "score": <1-10>, "comment": "<specific observation>", "quote": "<exact quote from candidate>" }
  }
}` }]
      }],
    });

    const text = response.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    const assessment = JSON.parse(clean);
    return NextResponse.json({ assessment });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}