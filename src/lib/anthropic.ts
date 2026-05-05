import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (_client) return _client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다. .env.local 또는 Vercel 환경 변수를 확인하세요."
    );
  }

  _client = new Anthropic({ apiKey });
  return _client;
}

export const MODEL_ID = "claude-sonnet-4-6";
