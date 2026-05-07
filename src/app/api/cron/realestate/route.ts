import { NextResponse } from "next/server";
import { fetchRealestateHeadlines } from "@/lib/realestate-rss";
import { generateJson } from "@/lib/gemini";
import { saveRealestate, todayKSTString } from "@/lib/blob";
import type { RealestateBriefing, RealestateTopic, RealestateArticle } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateKST = todayKSTString();
  console.log(`[cron/realestate] ${dateKST} 부동산 뉴스 생성 시작`);

  try {
    const headlines = await fetchRealestateHeadlines();
    if (headlines.length === 0) throw new Error("RSS 기사 없음");

    const raw = await generateJson(
      SYSTEM_PROMPT,
      `다음 기사들을 분류해주세요:\n${headlines.map((h, i) => `${i}. [${h.outlet}] ${h.title}`).join("\n")}`
    );

    const parsed = JSON.parse(raw) as { results?: { idx: number; topic: string }[] };
    const classifications = parsed.results ?? [];

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

    await saveRealestate(briefing);
    const total = briefing.topics.reduce((s, t) => s + t.articles.length, 0);
    console.log(`[cron/realestate] 완료. 총 ${total}개 기사`);

    return NextResponse.json({ ok: true, dateKST, total });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[cron/realestate] 오류:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
