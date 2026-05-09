import { NextResponse } from "next/server";
import { getCountry } from "@/lib/countries";
import type { CountryConfig } from "@/lib/countries";
import { todayKST } from "@/lib/date";
import { generateJson } from "@/lib/gemini";
import { buildGroupSystemPrompt, GROUP_USER_MESSAGE } from "@/lib/prompt";
import { parseGroupResponse } from "@/lib/parse";
import { fetchOutletHeadlines, formatHeadlinesForPrompt } from "@/lib/rss";
import type { CountryBriefing } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let countryIds: string[] = [];
  try {
    const body = (await req.json()) as { countryIds?: unknown };
    if (!Array.isArray(body?.countryIds) || body.countryIds.some((id) => typeof id !== "string")) {
      return NextResponse.json(
        { error: "countryIds 문자열 배열이 필요합니다." },
        { status: 400 }
      );
    }
    countryIds = body.countryIds as string[];
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const countries: CountryConfig[] = countryIds
    .map((id) => getCountry(id))
    .filter((c): c is CountryConfig => c !== undefined);

  if (countries.length === 0) {
    return NextResponse.json(
      { error: "유효한 국가가 없습니다." },
      { status: 400 }
    );
  }

  const dateKST = todayKST();

  try {
    // Fetch RSS for every outlet across the group in parallel.
    const headlinesByCountry = await Promise.all(
      countries.map(async (c) => {
        const { headlines } = await fetchOutletHeadlines(c.outletEntries);
        return { country: c, headlines };
      })
    );

    const usableCountries = headlinesByCountry.filter((h) => h.headlines.length > 0);
    if (usableCountries.length === 0) {
      return NextResponse.json(
        { error: "모든 국가의 RSS 페치가 실패했습니다." },
        { status: 502 }
      );
    }

    const sections = usableCountries
      .map(({ country, headlines }) => {
        const text = formatHeadlinesForPrompt(headlines);
        // generate.ts(크론 경로)와 동일하게 카테고리 제한 힌트 포함
        const catHint = country.categories
          ? ` [카테고리: ${country.categories.join(", ")}만]`
          : "";
        return `\n## [id=${country.id}] ${country.flag} ${country.name} (${country.outlets})${catHint}\n${text}`;
      })
      .join("\n");

    const raw = await generateJson(
      buildGroupSystemPrompt(dateKST),
      GROUP_USER_MESSAGE(dateKST, sections)
    );

    const itemsByCountry = parseGroupResponse(raw);

    const briefings: CountryBriefing[] = countries.map((c) => ({
      countryId: c.id,
      flag: c.flag,
      name: c.name,
      outlets: c.outlets,
      items: itemsByCountry[c.id] ?? [],
      generatedAt: new Date().toISOString(),
    }));

    return NextResponse.json({ briefings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[briefing/group] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
