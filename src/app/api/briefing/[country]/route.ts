import { NextResponse } from "next/server";
import { getCountry } from "@/lib/countries";
import { todayKST } from "@/lib/date";
import { getAnthropicClient, MODEL_ID } from "@/lib/anthropic";
import {
  buildCountrySystemPrompt,
  COUNTRY_USER_MESSAGE,
} from "@/lib/prompt";
import { extractTextOutput, parseCountryItems } from "@/lib/parse";
import type { CountryBriefing } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ country: string }> }
) {
  const { country: countryId } = await params;
  const country = getCountry(countryId);
  if (!country) {
    return NextResponse.json(
      { error: `알 수 없는 국가 ID: ${countryId}` },
      { status: 404 }
    );
  }

  const dateKST = todayKST();

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 6144,
      system: buildCountrySystemPrompt(country, dateKST),
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
      messages: [
        { role: "user", content: COUNTRY_USER_MESSAGE(country, dateKST) },
      ],
    });

    const raw = extractTextOutput(message);
    const items = parseCountryItems(raw);

    const briefing: CountryBriefing = {
      countryId: country.id,
      flag: country.flag,
      name: country.name,
      outlets: country.outlets,
      items,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(briefing);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error(`[briefing/${countryId}] error:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
