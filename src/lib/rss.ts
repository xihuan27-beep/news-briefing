import type { OutletConfig } from "./countries";
import {
  xmlParser,
  FETCH_TIMEOUT_MS,
  isRecent,
  pickText,
  pickLink,
  stripHtml,
  extractItems,
} from "./rss-utils";
import type { RawItem } from "./rss-utils";

export interface Headline {
  outletName: string;
  title: string;
  link: string;
  description?: string;
  publishedAt?: string;
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
    const parsed = xmlParser.parse(xml) as import("./rss-utils").ParsedFeed;
    const allItems = extractItems(parsed);

    // 36시간 이내 기사만 필터링. 최신 기사가 하나도 없으면 최근 5개 fallback
    const recentItems = allItems.filter((it: RawItem) => {
      const dateStr = it.pubDate || it.published || it.updated || it["dc:date"];
      return isRecent(dateStr);
    });
    const rawItems = (recentItems.length > 0 ? recentItems : allItems.slice(0, 5)).slice(0, 20);

    return rawItems
      .map((it: RawItem): Headline | null => {
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
