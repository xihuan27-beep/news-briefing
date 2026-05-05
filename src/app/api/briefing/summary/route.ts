import { NextResponse } from "next/server";
import { getAnthropicClient, MODEL_ID } from "@/lib/anthropic";
import { buildSummarySystemPrompt, SUMMARY_USER_MESSAGE } from "@/lib/prompt";
import { extractTextOutput, parseSummary } from "@/lib/parse";
import type { CountryBriefing } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let briefings: CountryBriefing[] = [];
  try {
    const body = (await req.json()) as { briefings?: CountryBriefing[] };
    if (!body || !Array.isArray(body.briefings)) {
      return NextResponse.json(
        { error: "briefings 배열이 필요합니다." },
        { status: 400 }
      );
    }
    briefings = body.briefings;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  if (briefings.length === 0) {
    return NextResponse.json(
      { error: "최소 1개국 브리핑이 필요합니다." },
      { status: 400 }
    );
  }

  // Compact form to keep token cost down: only category + body lines.
  const compact = briefings.map((c) => ({
    name: c.name,
    items: c.items.map((i) => ({ category: i.category, body: i.body })),
  }));
  const briefingsJson = JSON.stringify(compact, null, 2);

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 1024,
      system: buildSummarySystemPrompt(),
      messages: [
        { role: "user", content: SUMMARY_USER_MESSAGE(briefingsJson) },
      ],
    });

    const raw = extractTextOutput(message);
    const text = parseSummary(raw);

    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[briefing/summary] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
