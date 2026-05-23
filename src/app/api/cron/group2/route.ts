import { NextResponse } from "next/server";
import { COUNTRIES } from "@/lib/countries";
import { generateGroupBriefing, generateSummaryText } from "@/lib/generate";
import {
  saveBriefing,
  loadPartialBriefings,
  todayKSTString,
} from "@/lib/blob";
import { todayKST } from "@/lib/date";
import type { CountryBriefing } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const half = Math.ceil(COUNTRIES.length / 2);
const GROUP2 = COUNTRIES.slice(half);

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateKST = todayKSTString();
  console.log(`[cron/group2] ${dateKST} 그룹2 브리핑 생성 시작 (${GROUP2.length}개국)`);

  try {
    const group1Briefings = await loadPartialBriefings();
    if (!group1Briefings) {
      console.warn("[cron/group2] group1 partial 없음. 빈 배열로 진행");
    }

    // GROUP2 생성 (RSS + Gemini, ~35s)
    const group2Briefings = await generateGroupBriefing(GROUP2);

    const allBriefings: CountryBriefing[] = [
      ...(group1Briefings ?? []),
      ...group2Briefings,
    ];

    const succeeded = allBriefings.filter((b) => b.items.length > 0);

    if (succeeded.length === 0) {
      return NextResponse.json({ error: "모든 국가 브리핑 생성 실패" }, { status: 500 });
    }

    // 요약 생성 (~12s) — 부동산은 on-demand으로만 제공
    const summary = await generateSummaryText(succeeded);

    const generatedAt = new Date().toISOString();
    await saveBriefing({
      dateKST: todayKST(),
      briefings: allBriefings,
      summary,
      generatedAt,
    });

    console.log(`[cron/group2] 완료. ${succeeded.length}개국 성공, generatedAt=${generatedAt}`);

    return NextResponse.json({
      ok: true,
      dateKST,
      succeeded: succeeded.length,
      total: allBriefings.length,
      generatedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[cron/group2] 오류:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
