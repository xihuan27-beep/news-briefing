import { COUNTRIES } from "@/lib/countries";
import type { CountryConfig } from "@/lib/countries";
import { todayKST } from "@/lib/date";
import { generateJson } from "@/lib/gemini";
import {
  buildGroupSystemPrompt,
  GROUP_USER_MESSAGE,
  buildSummarySystemPrompt,
  SUMMARY_USER_MESSAGE,
} from "@/lib/prompt";
import { parseGroupResponse, parseSummary } from "@/lib/parse";
import { fetchOutletHeadlines, formatHeadlinesForPrompt } from "@/lib/rss";
import type { CountryBriefing } from "@/lib/types";

export interface FullBriefingResult {
  dateKST: string;
  briefings: CountryBriefing[];
  summary: string;
  generatedAt: string;
}

async function generateGroupBriefing(
  countries: CountryConfig[]
): Promise<CountryBriefing[]> {
  const dateKST = todayKST();

  const headlinesByCountry = await Promise.all(
    countries.map(async (c) => {
      const { headlines } = await fetchOutletHeadlines(c.outletEntries);
      return { country: c, headlines };
    })
  );

  const usable = headlinesByCountry.filter((h) => h.headlines.length > 0);
  if (usable.length === 0) throw new Error("모든 RSS 페치 실패");

  const sections = usable
    .map(
      ({ country, headlines }) =>
        `\n## [id=${country.id}] ${country.flag} ${country.name} (${country.outlets})\n${formatHeadlinesForPrompt(headlines)}`
    )
    .join("\n");

  const raw = await generateJson(
    buildGroupSystemPrompt(dateKST),
    GROUP_USER_MESSAGE(dateKST, sections)
  );

  const itemsByCountry = parseGroupResponse(raw);

  return countries.map((c) => ({
    countryId: c.id,
    flag: c.flag,
    name: c.name,
    outlets: c.outlets,
    items: itemsByCountry[c.id] ?? [],
    generatedAt: new Date().toISOString(),
  }));
}

async function generateSummaryText(
  briefings: CountryBriefing[]
): Promise<string> {
  const compact = briefings.map((c) => ({
    name: c.name,
    items: c.items.map((i) => ({ category: i.category, body: i.body })),
  }));
  const raw = await generateJson(
    buildSummarySystemPrompt(),
    SUMMARY_USER_MESSAGE(JSON.stringify(compact, null, 2))
  );
  return parseSummary(raw);
}

export async function generateFullBriefing(): Promise<FullBriefingResult> {
  const dateKST = todayKST();
  const half = Math.ceil(COUNTRIES.length / 2);
  const groups = [COUNTRIES.slice(0, half), COUNTRIES.slice(half)];

  // 동시 호출 시 Gemini 무료 티어 rate limit 문제로 순차 실행
  const groupResults: PromiseSettledResult<CountryBriefing[]>[] = [];
  for (const g of groups) {
    const result = await generateGroupBriefing(g).then(
      (v) => ({ status: "fulfilled" as const, value: v }),
      (e) => ({ status: "rejected" as const, reason: e })
    );
    groupResults.push(result);
  }

  const succeeded: CountryBriefing[] = [];
  const all: CountryBriefing[] = [];

  groupResults.forEach((result, i) => {
    if (result.status === "fulfilled") {
      result.value.forEach((b) => {
        all.push(b);
        if (b.items.length > 0) succeeded.push(b);
      });
    } else {
      groups[i].forEach((c) =>
        all.push({
          countryId: c.id,
          flag: c.flag,
          name: c.name,
          outlets: c.outlets,
          items: [],
          generatedAt: new Date().toISOString(),
        })
      );
    }
  });

  if (succeeded.length === 0) throw new Error("모든 국가 브리핑 생성 실패");

  const summary = await generateSummaryText(succeeded);

  return {
    dateKST,
    briefings: all,
    summary,
    generatedAt: new Date().toISOString(),
  };
}
