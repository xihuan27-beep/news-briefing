import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;

// Flash-lite has the same generation quality for translation/categorization
// tasks, but a much higher free-tier daily quota (1000 RPD vs 20 RPD).
// One full briefing = 11 requests, so flash-lite gives ~90 generations/day.
export const MODEL_ID = "gemini-2.5-flash-lite";

export function getGeminiModel(): GenerativeModel {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. .env.local 또는 Vercel 환경 변수를 확인하세요."
      );
    }
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      temperature: 0.3,
      // Gemini 2.5 Flash uses internal "thinking" tokens. We push the
      // budget high enough that thinking never starves the actual JSON
      // output. Korean content easily eats 1-2K tokens after thinking.
      maxOutputTokens: 16384,
      responseMimeType: "application/json",
    },
  });
}

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(503|429|500|502|504)\b/.test(msg);
}

export async function generateJson(systemPrompt: string, userMessage: string): Promise<string> {
  const model = getGeminiModel();
  const call = () =>
    model.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
    });

  try {
    const result = await call();
    return result.response.text();
  } catch (err) {
    if (!isRetryable(err)) throw err;
    // Single retry after a short delay — handles transient 503/429 from
    // shared Google free tier spikes. Keep wait short to fit Vercel 60s.
    await new Promise((r) => setTimeout(r, 3500));
    const result = await call();
    return result.response.text();
  }
}
