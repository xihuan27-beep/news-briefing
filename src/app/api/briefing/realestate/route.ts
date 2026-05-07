import { NextResponse } from "next/server";
import { fetchRealestateHeadlines } from "@/lib/realestate-rss";
import { generateJson } from "@/lib/gemini";
import type { RealestateBriefing, RealestateTopic, RealestateArticle } from "@/lib/types";

const TOPICS: RealestateTopic[] = ["재개발", "아파트", "꼬마빌딩", "상업용 부동산"];

const SYSTEM_PROMPT = `당신은 한국 부동산 뉴스 분류 전문가입니다.
주어진 기사 목록을 다음 4개 토픽 중 하나로 분류하거나, 해당없음으로 처리하세요:
- 재개발: 재개발, 재건축, 정비사업, 뉴타운, 도시재생 관련
- 아파트: 아파트 매매, 분양, 청약, 입주, 단지, 가격 관련
- 꼬마빌딩: 소형 빌딩, 꼬마빌딩, 수익형 부동산, 소규모 상업용 건물 관련
- 상업용 부동산: 오피스, 상가, 대형 빌딩, 물류센터, 리테일, 호텔 관련
- 해당없음: 위 4개 토픽에 해당하지 않는 기사

반드시 아래 JSON 형식만 반환하세요:
{ "results": [{ "idx": 0, "topic": "재개발" }, ...] }`;

function buildUserMessage(articles: { title: string; outlet: string }[]): string {
  const lines = articles.map((a, i) => `${i}. [${a.outlet}] ${a.title}`).join("\n");
  return `다음 기사들을 분류해주세요:\n${lines}`;
}

function parseClassification(raw: string): { idx: number; topic: string }[] {
  try {
    const parsed = JSON.parse(raw) as { results?: { idx: number; topic: string }[] };
    return parsed.results ?? [];
  } catch {
    return [];
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const headlines = await fetchRealestateHeadlines();

    if (headlines.length === 0) {
      // Return empty structure if no headlines found
      const empty: RealestateBriefing = {
        topics: TOPICS.map((topic) => ({ topic, articles: [] })),
        generatedAt: new Date().toISOString(),
      };
      return NextResponse.json(empty);
    }

    // Classify with Gemini
    const raw = await generateJson(
      SYSTEM_PROMPT,
      buildUserMessage(headlines.map((h) => ({ title: h.title, outlet: h.outlet })))
    );
    const classifications = parseClassification(raw);

    // Build topic → articles map
    const byTopic = new Map<RealestateTopic, RealestateArticle[]>(
      TOPICS.map((t) => [t, []])
    );

    for (const c of classifications) {
      if (!TOPICS.includes(c.topic as RealestateTopic)) continue;
      const topic = c.topic as RealestateTopic;
      const h = headlines[c.idx];
      if (!h) continue;
      const list = byTopic.get(topic)!;
      if (list.length < 5) {
        list.push({ title: h.title, url: h.link, outlet: h.outlet, pubDate: h.pubDate, topic });
      }
    }

    const briefing: RealestateBriefing = {
      topics: TOPICS.map((topic) => ({ topic, articles: byTopic.get(topic) ?? [] })),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(briefing);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
