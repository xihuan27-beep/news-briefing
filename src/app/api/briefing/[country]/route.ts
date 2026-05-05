import { NextResponse } from "next/server";
import { getCountry } from "@/lib/countries";
import { todayKST } from "@/lib/date";
import { generateJson } from "@/lib/gemini";
import {
  buildCountrySystemPrompt,
  COUNTRY_USER_MESSAGE,
} from "@/lib/prompt";
import { parseCountryItems } from "@/lib/parse";
import { fetchOutletHeadlines, formatHeadlinesForPrompt } from "@/lib/rss";
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
    const { headlines, failures } = await fetchOutletHeadlines(country.outletEntries);

    if (headlines.length === 0) {
      const reason =
        failures.length > 0
          ? failures.map((f) => `${f.outlet}: ${f.error}`).join("; ")
          : "RSS 피드에서 헤드라인을 가져오지 못했습니다";
      return NextResponse.json(
        { error: `RSS 페치 실패 — ${reason}` },
        { status: 502 }
      );
    }

    const headlinesText = formatHeadlinesForPrompt(headlines);
    const raw = await generateJson(
      buildCountrySystemPrompt(country, dateKST),
      COUNTRY_USER_MESSAGE(country, dateKST, headlinesText)
    );
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
