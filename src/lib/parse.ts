import type { BriefingItem, Category } from "./types";
import { CATEGORY_ORDER } from "./types";

const VALID_CATEGORIES: ReadonlySet<Category> = new Set(CATEGORY_ORDER);

export function stripCodeFence(raw: string): string {
  let text = raw.trim();
  // Pull the largest JSON object out, in case the model wraps it.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

interface RawItem {
  category?: unknown;
  body?: unknown;
  reason?: unknown;
  sources?: unknown;
}

export function parseCountryItems(raw: string): BriefingItem[] {
  const json = stripCodeFence(raw);
  let parsed: { items?: unknown };
  try {
    parsed = JSON.parse(json) as { items?: unknown };
  } catch (e) {
    const truncated = json.length > 500;
    console.error(
      `[parse] JSON parse failed (length ${json.length}${truncated ? ", possibly truncated" : ""}):`,
      json.slice(-300)
    );
    throw e;
  }
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error("응답에 items 배열이 없습니다.");
  }

  const items: BriefingItem[] = [];
  for (const rawItem of parsed.items as RawItem[]) {
    if (!rawItem || typeof rawItem !== "object") continue;
    const category = rawItem.category;
    const body = rawItem.body;
    const reason = rawItem.reason;
    const sources = rawItem.sources;

    if (typeof category !== "string" || !VALID_CATEGORIES.has(category as Category)) continue;
    if (typeof body !== "string" || !body.trim()) continue;
    if (typeof reason !== "string" || !reason.trim()) continue;
    if (!Array.isArray(sources) || sources.length === 0) continue;

    const cleanSources = sources
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const obj = s as { label?: unknown; url?: unknown };
        if (typeof obj.label !== "string" || typeof obj.url !== "string") return null;
        if (!/^https?:\/\//i.test(obj.url)) return null;
        return { label: obj.label.trim(), url: obj.url.trim() };
      })
      .filter((s): s is { label: string; url: string } => s !== null)
      .slice(0, 3);

    if (cleanSources.length === 0) continue;

    items.push({
      category: category as Category,
      body: body.trim(),
      reason: reason.trim(),
      sources: cleanSources,
    });
  }

  // Order items by canonical category sequence.
  items.sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  );
  return items;
}

export function parseSummary(raw: string): string {
  const json = stripCodeFence(raw);
  const parsed = JSON.parse(json) as { text?: unknown };
  if (!parsed || typeof parsed.text !== "string" || !parsed.text.trim()) {
    throw new Error("응답에 text 필드가 없습니다.");
  }
  return parsed.text.trim();
}
