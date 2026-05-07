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
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
    // thinking을 끄면 각 호출이 25초 → 5-10초로 단축됨.
    // 3번 호출 합계가 60초 안에 완료되어 크론 타임아웃 방지.
    // @ts-expect-error - thinkingConfig is supported but not yet in the type definitions
    thinkingConfig: { thinkingBudget: 0 },
  });
}

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(503|429|500|502|504)\b/.test(msg);
}

const RETRY_DELAYS_MS = [2500, 6000];

export async function generateJson(systemPrompt: string, userMessage: string): Promise<string> {
  const model = getGeminiModel();
  const call = () =>
    model.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
    });

  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await call();
      return result.response.text();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === RETRY_DELAYS_MS.length) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastErr;
}
