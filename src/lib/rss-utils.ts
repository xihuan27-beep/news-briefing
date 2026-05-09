/**
 * RSS 파싱 공통 유틸리티.
 * rss.ts와 realestate-rss.ts에서 공유한다.
 */
import { XMLParser } from "fast-xml-parser";

// ── 공통 타입 ────────────────────────────────────────────────────────────────

export interface RawItem {
  title?: string | { "#text"?: string };
  link?: string | { "#text"?: string; "@_href"?: string } | Array<{ "@_href"?: string; "@_rel"?: string }>;
  description?: string;
  summary?: string | { "#text"?: string };
  pubDate?: string;
  published?: string;
  updated?: string;
  "dc:date"?: string;
}

export interface ParsedFeed {
  rss?: { channel?: { item?: RawItem | RawItem[] } };
  feed?: { entry?: RawItem | RawItem[] };
  "rdf:RDF"?: { item?: RawItem | RawItem[] };
}

// ── 공통 상수 ────────────────────────────────────────────────────────────────

export const FETCH_TIMEOUT_MS = 8000;
export const RECENT_HOURS = 36; // 36시간 이내 기사만 포함 (시차 여유 포함)

export const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

// ── 공통 함수 ────────────────────────────────────────────────────────────────

export function parseDate(str: string): Date | null {
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function isRecent(publishedAt: string | undefined): boolean {
  if (!publishedAt) return true; // 날짜 없으면 포함
  const d = parseDate(publishedAt);
  if (!d) return true; // 파싱 실패하면 포함
  return Date.now() - d.getTime() < RECENT_HOURS * 60 * 60 * 1000;
}

export function pickText(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (
    v &&
    typeof v === "object" &&
    "#text" in v &&
    typeof (v as { "#text": unknown })["#text"] === "string"
  ) {
    return ((v as { "#text": string })["#text"]).trim();
  }
  return "";
}

export function pickLink(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) {
    // Atom feed: <link rel="alternate" href="..."/>
    for (const item of v) {
      const href = (item as { "@_href"?: string; "@_rel"?: string })?.["@_href"];
      const rel = (item as { "@_rel"?: string })?.["@_rel"];
      if (href && (!rel || rel === "alternate")) return href.trim();
    }
    return "";
  }
  if (v && typeof v === "object") {
    const obj = v as { "#text"?: string; "@_href"?: string };
    return (obj["@_href"] || obj["#text"] || "").trim();
  }
  return "";
}

export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractItems(parsed: ParsedFeed): RawItem[] {
  if (parsed.rss?.channel?.item) {
    const items = parsed.rss.channel.item;
    return Array.isArray(items) ? items : [items];
  }
  if (parsed.feed?.entry) {
    const items = parsed.feed.entry;
    return Array.isArray(items) ? items : [items];
  }
  if (parsed["rdf:RDF"]?.item) {
    const items = parsed["rdf:RDF"].item;
    return Array.isArray(items) ? items : [items];
  }
  return [];
}
