/**
 * Vercel Blob 저장소 래퍼.
 * BLOB_READ_WRITE_TOKEN 환경변수가 없으면 graceful하게 null 반환.
 */
import type { FullBriefingResult } from "@/lib/generate";

export function todayKSTString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
  }
}

export async function loadBriefing(): Promise<FullBriefingResult | null> {
  if (!isConfigured()) return null;
  try {
    const { list } = await import("@vercel/blob");
    const dateStr = todayKSTString();
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
