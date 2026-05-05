"use client";

import { useCallback, useState } from "react";
import { Header } from "@/components/Header";
import { CountryCard } from "@/components/CountryCard";
import { SummaryCard } from "@/components/SummaryCard";
import { COUNTRIES } from "@/lib/countries";
import { todayKSTLong } from "@/lib/date";
import type { BriefingStatus, CountryBriefing } from "@/lib/types";

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

export default function Home() {
  const [statuses, setStatuses] = useState<CountryStatuses>(initialStatuses);
  const [summary, setSummary] = useState<SummaryState>({ state: "idle" });

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
    // Reset everything to loading.
    setStatuses(
      Object.fromEntries(
        COUNTRIES.map((c) => [c.id, { state: "loading" } as BriefingStatus])
      )
    );
    setSummary({ state: "idle" });

    // Group-mode: split 10 countries into 2 groups of 5, fire both groups
    // in parallel. Each group = one Gemini call. Total per click = 2 group
    // calls + 1 summary = 3 free-tier requests, comfortably under the 20/day
    // quota. Each group call returns up to 5 country briefings at once.
    const half = Math.ceil(COUNTRIES.length / 2);
    const groups = [COUNTRIES.slice(0, half), COUNTRIES.slice(half)];

    const groupResults = await Promise.allSettled(
      groups.map((g) => fetchGroup(g.map((c) => c.id)))
    );

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

  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-6">
      <Header
        dateLabel={todayKSTLong()}
        isLoading={isAnyLoading}
        hasResults={hasResults}
        onGenerate={handleGenerate}
      />

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

      <SummaryCard
        state={summary.state}
        text={summary.state === "ready" ? summary.text : undefined}
        errorMessage={summary.state === "error" ? summary.message : undefined}
      />
    </main>
  );
}
