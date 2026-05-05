import { XMLParser } from "fast-xml-parser";
import type { OutletConfig } from "./countries";

export interface Headline {
  outletName: string;
  title: string;
  link: string;
  description?: string;
  publishedAt?: string;
}

interface RawItem {
  title?: string | { "#text"?: string };
  link?: string | { "#text"?: string; "@_href"?: string } | Array<{ "@_href"?: string }>;
  description?: string;
  summary?: string | { "#text"?: string };
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

async function fetchFeed(outlet: OutletConfig): Promise<Headline[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(outlet.rssUrl, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DailyBriefing/1.0; +https://news-briefing-swart.vercel.app/)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const xml = await res.text();
    const parsed = parser.parse(xml) as ParsedFeed;
    const rawItems = extractItems(parsed).slice(0, 25);

    return rawItems
      .map((it): Headline | null => {
        const title = stripHtml(pickText(it.title));
        const link = pickLink(it.link);
        const description = stripHtml(pickText(it.description ?? it.summary));
        const publishedAt =
          it.pubDate || it.published || it.updated || it["dc:date"] || undefined;
        if (!title || !link) return null;
        return {
          outletName: outlet.name,
          title,
          link,
          description: description ? description.slice(0, 280) : undefined,
          publishedAt,
        };
      })
      .filter((h): h is Headline => h !== null);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOutletHeadlines(
  outlets: OutletConfig[]
): Promise<{ headlines: Headline[]; failures: { outlet: string; error: string }[] }> {
  const results = await Promise.allSettled(outlets.map((o) => fetchFeed(o)));
  const headlines: Headline[] = [];
  const failures: { outlet: string; error: string }[] = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      headlines.push(...r.value);
    } else {
      const message = r.reason instanceof Error ? r.reason.message : String(r.reason);
      failures.push({ outlet: outlets[i].name, error: message });
      console.warn(`[rss] ${outlets[i].name} failed: ${message}`);
    }
  });

  return { headlines, failures };
}

export function formatHeadlinesForPrompt(headlines: Headline[]): string {
  const byOutlet = new Map<string, Headline[]>();
  for (const h of headlines) {
    const list = byOutlet.get(h.outletName) ?? [];
    list.push(h);
    byOutlet.set(h.outletName, list);
  }

  const lines: string[] = [];
  for (const [outlet, items] of byOutlet) {
    lines.push(`\n[${outlet}]`);
    items.slice(0, 20).forEach((h, idx) => {
      const date = h.publishedAt ? ` (${h.publishedAt})` : "";
      const desc = h.description ? `\n   요약: ${h.description}` : "";
      lines.push(`${idx + 1}. ${h.title}${date}\n   URL: ${h.link}${desc}`);
    });
  }
  return lines.join("\n");
}
