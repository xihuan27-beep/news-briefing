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

// ── 자산 단가/환율 추이 (수익률만 노출, 금액은 비노출) ──────────────────────────
export interface AssetReturnPoint {
  label: string;
  value: number; // 퍼센트, 예: 25.41
}

export interface AssetTrendItem {
  name: string;
  code: string;
  returns: AssetReturnPoint[];
}

export interface ExchangeRateItem {
  label: string;
  rate: number;
}

export interface AssetBriefing {
  priceTrend: AssetTrendItem[];
  focusTrend: AssetTrendItem[];
  exchangeRates: ExchangeRateItem[];
  generatedAt: string;
}

export type AssetStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; data: AssetBriefing }
  | { state: "error"; message: string };
