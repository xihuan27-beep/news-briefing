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
