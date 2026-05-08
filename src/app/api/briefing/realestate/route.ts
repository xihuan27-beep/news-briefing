import { NextResponse } from "next/server";
import { generateRealestateBriefing } from "@/lib/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(): Promise<NextResponse> {
  try {
    const briefing = await generateRealestateBriefing();
    return NextResponse.json(briefing);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
