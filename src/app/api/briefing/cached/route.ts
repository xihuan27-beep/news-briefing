import { NextResponse } from "next/server";
import { loadBriefing, todayKSTString } from "@/lib/blob";

export const runtime = "nodejs";

export async function GET() {
  const dateKST = todayKSTString();
  const data = await loadBriefing();

  if (!data) {
    return NextResponse.json(
      { error: "오늘 브리핑 없음", dateKST },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
