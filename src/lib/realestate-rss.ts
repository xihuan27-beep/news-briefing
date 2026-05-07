import { XMLParser } from "fast-xml-parser";

export interface RealestateHeadline {
  title: string;
  link: string;
  outlet: string;
  pubDate?: string;
}

interface RawItem {
  title?: string | { "#text"?: string };
  link?: string | { "#text"?: string; "@_href"?: string } | Array<{ "@_href"?: string }>;
  description?: string;
  pubDate?: string;
  published?: string;
  updated?: string;
  "dc:date"?: string;
}

interface ParsedFeed {
  rss?: { channel?: { item?: RawItem | RawItem[] } };
  feed?: { entry?: RawItem | RawItem[] };
  "rdf:RDF"?: { item?: RawItem | RawItem[] };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

const FETCH_TIMEOUT_MS = 8000;
const RECENT_HOURS = 36;

const REALESTATE_KEYWORDS = [
  "부동산", "아파트", "재개발", "재건축", "분양", "청약", "오피스텔",
  "상가", "빌딩", "전세", "임대", "매매", "공급", "주택", "단지",
  "꼬마빌딩", "상업용", "오피스", "토지", "개발", "건설", "시행",
  "입주", "준공", "허가", "용적률", "정비사업",
];

export const REALESTATE_OUTLETS = [
  {
    name: "연합뉴스 경제",
    rssUrl: "https://www.yna.co.kr/rss/economy.xml",
  },
  {
    name: "뉴시스 경제",
    rssUrl: "https://www.newsis.com/RSS/economy.xml",
  },
  {
    name: "비즈워치",
    rssUrl: "https://news.bizwatch.co.kr/rss",
  },
];

function parseDate(str: string): Date | null {
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function isRecent(publishedAt: string | undefined): boolean {
  if (!publishedAt) return true;
  const d = parseDate(publishedAt);
  if (!d) return true;
  return Date.now() - d.getTime() < RECENT_HOURS * 60 * 60 * 1000;
}

function pickText(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object" && "#text" in v && typeof (v as { "#text": unknown })["#text"] === "string") {
    return ((v as { "#text": string })["#text"]).trim();
  }
  return "";
}

function pickLink(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) {
    for (const item of v) {
      const href = (item as { "@_href"?: string })?.["@_href"];
      if (href) return href.trim();
    }
    return "";
  }
  if (v && typeof v === "object") {
    const obj = v as { "#text"?: string; "@_href"?: string };
    return (obj["@_href"] || obj["#text"] || "").trim();
  }
  return "";
}

function stripHtml(s: string): string {
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

function extractItems(parsed: ParsedFeed): RawItem[] {
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

function hasRealestateKeyword(text: string): boolean {
  return REALESTATE_KEYWORDS.some((kw) => text.includes(kw));
}

async function fetchOutletArticles(outlet: { name: string; rssUrl: string }): Promise<RealestateHeadline[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(outlet.rssUrl, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DailyBriefing/1.0; +https://news-briefing-swart.vercel.app/)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = parser.parse(xml) as ParsedFeed;
    const allItems = extractItems(parsed);

    const recentItems = allItems.filter((it) => {
      const dateStr = it.pubDate || it.published || it.updated || it["dc:date"];
      return isRecent(dateStr);
    });
    const rawItems = (recentItems.length > 0 ? recentItems : allItems.slice(0, 10)).slice(0, 50);

    return rawItems
      .map((it): RealestateHeadline | null => {
        const title = stripHtml(pickText(it.title));
        const link = pickLink(it.link);
        const pubDate = it.pubDate || it.published || it.updated || it["dc:date"] || undefined;
        if (!title || !link) return null;
        if (!hasRealestateKeyword(title)) return null;
        return { title, link, outlet: outlet.name, pubDate };
      })
      .filter((h): h is RealestateHeadline => h !== null);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRealestateHeadlines(): Promise<RealestateHeadline[]> {
  const results = await Promise.allSettled(REALESTATE_OUTLETS.map((o) => fetchOutletArticles(o)));
  const all: RealestateHeadline[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      all.push(...r.value);
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.warn(`[realestate-rss] ${REALESTATE_OUTLETS[i].name} failed: ${msg}`);
    }
  });
  return all;
}
