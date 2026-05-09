import { NextResponse } from "next/server";
import { COUNTRIES } from "@/lib/countries";
import { generateGroupBriefing, generateSummaryText, generateRealestateBriefing } from "@/lib/generate";
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
    // 그룹1 partial 로드 (group1 크론이 먼저 실행되어야 함)
    const group1Briefings = await loadPartialBriefings();
    if (!group1Briefings) {
      console.warn("[cron/group2] group1 partial 없음. 빈 배열로 진행");
    }

    // 그룹2 생성
    const group2Briefings = await generateGroupBriefing(GROUP2);

    // 전체 브리핑 합산
    const allBriefings: CountryBriefing[] = [
      ...(group1Briefings ?? []),
      ...group2Briefings,
    ];

    const succeeded = allBriefings.filter((b) => b.items.length > 0);

    if (succeeded.length === 0) {
      return NextResponse.json({ error: "모든 국가 브리핑 생성 실패" }, { status: 500 });
    }

    // summary + realestate 병렬 생성
    const [summary, realestate] = await Promise.all([
      generateSummaryText(succeeded),
      generateRealestateBriefing().catch((err) => {
        console.error("[cron/group2] realestate 생성 실패 (무시):", err);
        return undefined;
      }),
    ]);

    const generatedAt = new Date().toISOString();

    await saveBriefing({
      dateKST: todayKST(),
      briefings: allBriefings,
      summary,
      realestate,
      generatedAt,
    });

    console.log(
      `[cron/group2] 완료. 전체 ${succeeded.length}개국 성공, generatedAt=${generatedAt}`
    );

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
