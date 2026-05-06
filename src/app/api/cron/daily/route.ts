import { NextResponse } from "next/server";
import { generateFullBriefing } from "@/lib/generate";
import { saveBriefing, todayKSTString } from "@/lib/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  // Vercel Cron은 Authorization: Bearer <CRON_SECRET> 헤더를 자동으로 붙임
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateKST = todayKSTString();
  console.log(`[cron/daily] ${dateKST} 브리핑 생성 시작`);

  try {
    const result = await generateFullBriefing();
    await saveBriefing(result);

    const succeeded = result.briefings.filter((b) => b.items.length > 0).length;
    console.log(`[cron/daily] 완료. ${succeeded}개국 성공`);

    return NextResponse.json({
      ok: true,
      dateKST,
      succeeded,
      generatedAt: result.generatedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[cron/daily] 오류:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
