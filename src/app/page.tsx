"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { CountryCard } from "@/components/CountryCard";
import { SummaryCard } from "@/components/SummaryCard";
import { RealestateSection } from "@/components/RealestateSection";
import { COUNTRIES } from "@/lib/countries";
import { todayKSTLong } from "@/lib/date";
import type { BriefingStatus, CountryBriefing, RealestateStatus, RealestateBriefing } from "@/lib/types";
import type { FullBriefingResult } from "@/lib/generate";

type CountryStatuses = Record<string, BriefingStatus>;
type SummaryState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; text: string }
  | { state: "error"; message: string };

const initialStatuses: CountryStatuses = Object.fromEntries(
  COUNTRIES.map((c) => [c.id, { state: "idle" } as BriefingStatus])
);

async function fetchCountry(id: string): Promise<CountryBriefing> {
  const res = await fetch(`/api/briefing/${id}`, { method: "POST" });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || `HTTP ${res.status}`);
  }
  return (await res.json()) as CountryBriefing;
}

async function fetchGroup(countryIds: string[]): Promise<CountryBriefing[]> {
  const res = await fetch("/api/briefing/group", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ countryIds }),
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || `HTTP ${res.status}`);
  }
  const body = (await res.json()) as { briefings: CountryBriefing[] };
  return body.briefings;
}

async function fetchSummary(briefings: CountryBriefing[]): Promise<string> {
  const res = await fetch("/api/briefing/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ briefings }),
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || `HTTP ${res.status}`);
  }
  const body = (await res.json()) as { text: string };
  return body.text;
}

function statusesFromBriefings(briefings: CountryBriefing[]): CountryStatuses {
  const map: CountryStatuses = Object.fromEntries(
    COUNTRIES.map((c) => [c.id, { state: "idle" } as BriefingStatus])
  );
  for (const b of briefings) {
    if (b.items.length > 0) {
      map[b.countryId] = { state: "ready", data: b };
    }
    // 아이템 없는 국가는 idle 상태 유지 (버튼으로 재시도 가능)
  }
  return map;
}

async function fetchRealestate(): Promise<RealestateBriefing> {
  const res = await fetch("/api/briefing/realestate", { method: "POST" });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || `HTTP ${res.status}`);
  }
  return (await res.json()) as RealestateBriefing;
}

export default function Home() {
  const [statuses, setStatuses] = useState<CountryStatuses>(initialStatuses);
  const [summary, setSummary] = useState<SummaryState>({ state: "idle" });
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [cacheChecked, setCacheChecked] = useState(false);
  const [realestateStatus, setRealestateStatus] = useState<RealestateStatus>({ state: "loading" });

  // 페이지 로드 시 오늘 캐시된 브리핑 + 부동산 뉴스 자동 로드
  useEffect(() => {
    async function loadCached() {
      try {
        const res = await fetch("/api/briefing/cached");
        if (res.ok) {
          const data = (await res.json()) as FullBriefingResult;
          setStatuses(statusesFromBriefings(data.briefings));
          setSummary({ state: "ready", text: data.summary });
          setCachedAt(data.generatedAt);
        }
      } catch {
        // 캐시 없음 — 정상 (버튼 눌러서 생성)
      } finally {
        setCacheChecked(true);
      }
    }

    async function loadRealestate() {
      try {
        const data = await fetchRealestate();
        setRealestateStatus({ state: "ready", data });
      } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        setRealestateStatus({ state: "error", message });
      }
    }

    void loadCached();
    void loadRealestate();
  }, []);

  const isAnyLoading =
    Object.values(statuses).some((s) => s.state === "loading") ||
    summary.state === "loading";

  const hasResults = Object.values(statuses).some((s) => s.state === "ready");

  const generateOne = useCallback(async (id: string) => {
    setStatuses((prev) => ({ ...prev, [id]: { state: "loading" } }));
    try {
      const data = await fetchCountry(id);
      setStatuses((prev) => ({ ...prev, [id]: { state: "ready", data } }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setStatuses((prev) => ({ ...prev, [id]: { state: "error", message } }));
      return null;
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    setCachedAt(null);
    setStatuses(
      Object.fromEntries(
        COUNTRIES.map((c) => [c.id, { state: "loading" } as BriefingStatus])
      )
    );
    setSummary({ state: "idle" });

    const half = Math.ceil(COUNTRIES.length / 2);
    const groups = [COUNTRIES.slice(0, half), COUNTRIES.slice(half)];

    // Gemini 무료 티어 동시 호출 rate limit 방지 — 순차 실행
    const groupResults: PromiseSettledResult<CountryBriefing[]>[] = [];
    for (const g of groups) {
      const result = await fetchGroup(g.map((c) => c.id)).then(
        (v) => ({ status: "fulfilled" as const, value: v }),
        (e) => ({ status: "rejected" as const, reason: e })
      );
      groupResults.push(result);
    }

    const succeeded: CountryBriefing[] = [];

    groupResults.forEach((result, groupIdx) => {
      const group = groups[groupIdx];
      if (result.status === "fulfilled") {
        const byId = new Map(result.value.map((b) => [b.countryId, b]));
        for (const country of group) {
          const data = byId.get(country.id);
          if (data && data.items.length > 0) {
            setStatuses((prev) => ({
              ...prev,
              [country.id]: { state: "ready", data },
            }));
            succeeded.push(data);
          } else {
            setStatuses((prev) => ({
              ...prev,
              [country.id]: {
                state: "error",
                message: "응답에 카테고리가 포함되지 않음",
              },
            }));
          }
        }
      } else {
        const message =
          result.reason instanceof Error
            ? result.reason.message
            : "알 수 없는 오류";
        for (const country of group) {
          setStatuses((prev) => ({
            ...prev,
            [country.id]: { state: "error", message },
          }));
        }
      }
    });

    if (succeeded.length === 0) return;

    setSummary({ state: "loading" });
    try {
      const text = await fetchSummary(succeeded);
      setSummary({ state: "ready", text });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setSummary({ state: "error", message });
    }
  }, []);

  const handleRetry = useCallback(
    (id: string) => {
      void generateOne(id);
    },
    [generateOne]
  );

  // 캐시 확인 전에는 아무것도 렌더링하지 않음 (레이아웃 깜빡임 방지)
  if (!cacheChecked) {
    return (
      <main className="mx-auto max-w-2xl px-5 sm:px-6">
        <Header
          dateLabel={todayKSTLong()}
          isLoading={false}
          hasResults={false}
          cachedAt={null}
          onGenerate={handleGenerate}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-6">
      <Header
        dateLabel={todayKSTLong()}
        isLoading={isAnyLoading}
        hasResults={hasResults}
        cachedAt={cachedAt}
        onGenerate={handleGenerate}
      />

      <RealestateSection status={realestateStatus} />

      {(isAnyLoading || hasResults) && (
        <div className="space-y-10">
          {COUNTRIES.map((country) => (
            <CountryCard
              key={country.id}
              country={country}
              status={statuses[country.id]}
              onRetry={() => handleRetry(country.id)}
            />
          ))}
        </div>
      )}

      <SummaryCard
        state={summary.state}
        text={summary.state === "ready" ? summary.text : undefined}
        errorMessage={summary.state === "error" ? summary.message : undefined}
      />
    </main>
  );
}
