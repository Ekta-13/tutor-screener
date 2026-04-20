import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SYSTEM_PROMPT = `You are a warm, professional AI interviewer for Cuemath, screening tutor candidates. Your goal is to assess their communication clarity, patience, warmth, ability to simplify concepts, and English fluency.

Conduct a natural 5-6 question interview. Ask one question at a time. Start by welcoming them and asking them to introduce themselves.

After the introduction, ask questions like:
- "Can you explain fractions to a 9-year-old as if they've never heard of them before?"
- "A student has been staring at a problem for 5 minutes and says they don't understand. What do you do?"
- "How do you keep a child motivated when they're struggling?"
- "Tell me about a time you explained something difficult in a simple way."

Be conversational, warm and encouraging. Follow up on vague answers. When you have asked all questions, say exactly: "INTERVIEW_COMPLETE" and nothing else.`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const contents = messages && messages.length > 0
      ? messages.map((m: { role: string; content: string }) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }))
      : [{ role: "user", parts: [{ text: "Please start the interview by welcoming the candidate warmly and asking them to introduce themselves." }] }];

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      config: { systemInstruction: SYSTEM_PROMPT },
      contents,
    });

    const message = response.text ?? "";
    return NextResponse.json({ message });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}