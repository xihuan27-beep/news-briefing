import { NextResponse } from "next/server";
import { generateSummaryText, generateRealestateBriefing } from "@/lib/generate";
import { saveBriefing, loadBriefing, todayKSTString } from "@/lib/blob";
import { todayKST } from "@/lib/date";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateKST = todayKSTString();
  console.log(`[cron/group3] ${dateKST} 요약·부동산 생성 시작`);

  try {
    // group2가 저장한 중간 blob 로드
    const existing = await loadBriefing();
    if (!existing) {
      return NextResponse.json(
        { error: "group2 blob 없음 — group2 크론이 먼저 실행되어야 합니다." },
        { status: 500 }
      );
    }

    const succeeded = existing.briefings.filter((b) => b.items.length > 0);
    if (succeeded.length === 0) {
      return NextResponse.json({ error: "브리핑 데이터 없음" }, { status: 500 });
    }

    // 요약 + 부동산 병렬 생성 (~20-25s)
    const [summary, realestate] = await Promise.all([
      generateSummaryText(succeeded),
      generateRealestateBriefing().catch((err) => {
        console.error("[cron/group3] realestate 생성 실패 (무시):", err);
        return undefined;
      }),
    ]);

    const generatedAt = new Date().toISOString();

    await saveBriefing({
      dateKST: todayKST(),
      briefings: existing.briefings,
      summary,
      realestate,
      generatedAt,
    });

    console.log(`[cron/group3] 완료. 요약·부동산 저장 완료, generatedAt=${generatedAt}`);

    return NextResponse.json({ ok: true, dateKST, generatedAt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[cron/group3] 오류:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
