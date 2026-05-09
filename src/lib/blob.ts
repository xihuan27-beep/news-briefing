/**
 * Vercel Blob 저장소 래퍼.
 * BLOB_READ_WRITE_TOKEN 환경변수가 없으면 graceful하게 null 반환.
 */
import { todayKST } from "@/lib/date";
import type { FullBriefingResult } from "@/lib/generate";

// todayKSTString은 date.ts의 todayKST()와 동일 → 중복 방지를 위해 re-export
export { todayKST as todayKSTString } from "@/lib/date";

function isConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function blobPath(dateStr: string): string {
  return `briefings/${dateStr}.json`;
}

export async function saveBriefing(data: FullBriefingResult): Promise<void> {
  if (!isConfigured()) {
    console.warn("[blob] BLOB_READ_WRITE_TOKEN 없음, 저장 건너뜀");
    return;
  }
  try {
    const { put } = await import("@vercel/blob");
    await put(blobPath(data.dateKST), JSON.stringify(data), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    console.log(`[blob] ${data.dateKST} 브리핑 저장 완료`);
  } catch (err) {
    console.error("[blob] saveBriefing 오류:", err);
    throw err;
  }
}

export async function loadBriefing(): Promise<FullBriefingResult | null> {
  if (!isConfigured()) return null;
  try {
    const { list } = await import("@vercel/blob");
    const dateStr = todayKST();
    const { blobs } = await list({ prefix: blobPath(dateStr) });
    if (blobs.length === 0) return null;

    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as FullBriefingResult;

    if (data.dateKST !== dateStr) return null;
    return data;
  } catch (err) {
    console.error("[blob] loadBriefing 오류:", err);
    return null;
  }
}
