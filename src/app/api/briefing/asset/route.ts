import { NextResponse } from "next/server";
import { fetchAssetBriefing } from "@/lib/sheet";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(): Promise<NextResponse> {
  if (!process.env.ASSET_SHEET_ID) {
    return NextResponse.json({ error: "ASSET_SHEET_ID 미설정", notConfigured: true }, { status: 404 });
  }
  try {
    const briefing = await fetchAssetBriefing();
    return NextResponse.json(briefing);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
