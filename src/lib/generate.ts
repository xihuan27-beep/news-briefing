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
import { fetchRealestateHeadlines } from "@/lib/realestate-rss";
import type { CountryBriefing, RealestateBriefing, RealestateTopic, RealestateArticle } from "@/lib/types";

export interface FullBriefingResult {
  dateKST: string;
  briefings: CountryBriefing[];
  summary: string;
  realestate?: RealestateBriefing;
  generatedAt: string;
}

// ── 부동산 ────────────────────────────────────────────────────────────────────

const REALESTATE_TOPICS: RealestateTopic[] = ["재개발", "아파트", "꼬마빌딩", "상업용 부동산"];

const REALESTATE_SYSTEM_PROMPT = `당신은 한국 부동산 뉴스 분류 전문가입니다.
주어진 기사 목록을 다음 4개 토픽 중 하나로 분류하거나, 해당없음으로 처리하세요:
- 재개발: 재개발, 재건축, 정비사업, 뉴타운, 도시재생 관련
- 아파트: 아파트 매매, 분양, 청약, 입주, 단지, 가격 관련
- 꼬마빌딩: 소형 빌딩, 꼬마빌딩, 수익형 부동산, 소규모 상업용 건물 관련
- 상업용 부동산: 오피스, 상가, 대형 빌딩, 물류센터, 리테일, 호텔 관련
- 해당없음: 위 4개 토픽에 해당하지 않는 기사

반드시 아래 JSON 형식만 반환하세요:
{ "results": [{ "idx": 0, "topic": "재개발" }, ...] }`;

function emptyRealestate(): RealestateBriefing {
  return {
    topics: REALESTATE_TOPICS.map((topic) => ({ topic, articles: [] })),
    generatedAt: new Date().toISOString(),
  };
}

export async function generateRealestateBriefing(): Promise<RealestateBriefing> {
  const headlines = await fetchRealestateHeadlines();

  if (headlines.length === 0) return emptyRealestate();

  const lines = headlines.map((h, i) => `${i}. [${h.outlet}] ${h.title}`).join("\n");
  const raw = await generateJson(
    REALESTATE_SYSTEM_PROMPT,
    `다음 기사들을 분류해주세요:\n${lines}`
  );

  let classifications: { idx: number; topic: string }[] = [];
  try {
    const parsed = JSON.parse(raw) as { results?: { idx: number; topic: string }[] };
    classifications = parsed.results ?? [];
  } catch {
    return emptyRealestate();
  }

  const byTopic = new Map<RealestateTopic, RealestateArticle[]>(
    REALESTATE_TOPICS.map((t) => [t, []])
  );

  for (const c of classifications) {
    if (!REALESTATE_TOPICS.includes(c.topic as RealestateTopic)) continue;
    const topic = c.topic as RealestateTopic;
    const h = headlines[c.idx];
    if (!h) continue;
    const list = byTopic.get(topic)!;
    if (list.length < 5) {
      list.push({ title: h.title, url: h.link, outlet: h.outlet, pubDate: h.pubDate, topic });
    }
  }

  return {
    topics: REALESTATE_TOPICS.map((topic) => ({ topic, articles: byTopic.get(topic) ?? [] })),
    generatedAt: new Date().toISOString(),
  };
}

// ── 국가별 브리핑 ─────────────────────────────────────────────────────────────

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
    .map(({ country, headlines }) => {
      const catHint = country.categories
        ? ` [카테고리: ${country.categories.join(", ")}만]`
        : "";
      return `\n## [id=${country.id}] ${country.flag} ${country.name} (${country.outlets})${catHint}\n${formatHeadlinesForPrompt(headlines)}`;
    })
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

  // summary와 realestate를 병렬로 생성 (둘 다 독립적인 Gemini 호출)
  const [summary, realestate] = await Promise.all([
    generateSummaryText(succeeded),
    generateRealestateBriefing().catch((err) => {
      console.error("[generate] realestate 생성 실패:", err);
      return emptyRealestate();
    }),
  ]);

  return {
    dateKST,
    briefings: all,
    summary,
    realestate,
    generatedAt: new Date().toISOString(),
  };
}
