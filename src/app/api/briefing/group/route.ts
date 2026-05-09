import { NextResponse } from "next/server";
import { getCountry } from "@/lib/countries";
import type { CountryConfig } from "@/lib/countries";
import { generateGroupBriefing } from "@/lib/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let countryIds: string[] = [];
  try {
    const body = (await req.json()) as { countryIds?: unknown };
    if (!Array.isArray(body?.countryIds) || body.countryIds.some((id) => typeof id !== "string")) {
      return NextResponse.json(
        { error: "countryIds 문자열 배열이 필요합니다." },
        { status: 400 }
      );
    }
    countryIds = body.countryIds as string[];
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const countries: CountryConfig[] = countryIds
    .map((id) => getCountry(id))
    .filter((c): c is CountryConfig => c !== undefined);

  if (countries.length === 0) {
    return NextResponse.json(
      { error: "유효한 국가가 없습니다." },
      { status: 400 }
    );
  }

  try {
    const briefings = await generateGroupBriefing(countries);
    return NextResponse.json({ briefings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[briefing/group] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
