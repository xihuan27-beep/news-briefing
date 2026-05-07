export type Category = "정치" | "경제" | "사회" | "IT";

export const CATEGORY_ORDER: Category[] = ["정치", "경제", "사회", "IT"];

export interface BriefingSource {
  label: string;
  url: string;
}

export interface BriefingItem {
  category: Category;
  body: string;
  reason: string;
  sources: BriefingSource[];
}

export interface CountryBriefing {
  countryId: string;
  flag: string;
  name: string;
  outlets: string;
  items: BriefingItem[];
  generatedAt: string;
}

export type BriefingStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; data: CountryBriefing }
  | { state: "error"; message: string };

// ── 부동산 정보 ──────────────────────────────────────
export type RealestateTopic = "재개발" | "아파트" | "꼬마빌딩" | "상업용 부동산";
export const REALESTATE_TOPICS: RealestateTopic[] = ["재개발", "아파트", "꼬마빌딩", "상업용 부동산"];

export interface RealestateArticle {
  title: string;
  url: string;
  outlet: string;
  pubDate?: string;
  topic: RealestateTopic;
}

export interface RealestateBriefing {
  topics: { topic: RealestateTopic; articles: RealestateArticle[] }[];
  generatedAt: string;
}

export type RealestateStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; data: RealestateBriefing }
  | { state: "error"; message: string };
