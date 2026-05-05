import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;

export const MODEL_ID = "gemini-2.5-flash";

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

export async function generateJson(systemPrompt: string, userMessage: string): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
  });
  return result.response.text();
}
