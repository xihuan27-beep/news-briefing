import { NextResponse } from "next/server";
import { COUNTRIES } from "@/lib/countries";
import { generateGroupBriefing } from "@/lib/generate";
import { savePartialBriefings, todayKSTString } from "@/lib/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

const half = Math.ceil(COUNTRIES.length / 2);
const GROUP1 = COUNTRIES.slice(0, half);

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateKST = todayKSTString();
  console.log(`[cron/group1] ${dateKST} 그룹1 브리핑 생성 시작 (${GROUP1.length}개국)`);

  try {
    const briefings = await generateGroupBriefing(GROUP1);
    const withItems = briefings.filter((b) => b.items.length > 0);

    await savePartialBriefings(briefings);

    console.log(`[cron/group1] 완료. ${withItems.length}/${GROUP1.length}개국 성공`);

    return NextResponse.json({
      ok: true,
      dateKST,
      succeeded: withItems.length,
      total: GROUP1.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[cron/group1] 오류:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
