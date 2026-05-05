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

    // Stagger calls in batches to stay under Anthropic's per-minute token
    // rate limit and avoid Vercel function contention. 3 in parallel is the
    // sweet spot — fast enough, but won't trip 429s.
    const BATCH_SIZE = 3;
    const succeeded: CountryBriefing[] = [];
    for (let i = 0; i < COUNTRIES.length; i += BATCH_SIZE) {
      const batch = COUNTRIES.slice(i, i + BATCH_SIZE);
      const settled = await Promise.allSettled(
        batch.map((c) => generateOne(c.id))
      );
      for (const r of settled) {
        if (r.status === "fulfilled" && r.value !== null) {
          succeeded.push(r.value);
        }
      }
    }

    if (succeeded.length === 0) return;

    setSummary({ state: "loading" });
    try {
      const text = await fetchSummary(succeeded);
      setSummary({ state: "ready", text });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setSummary({ state: "error", message });
    }
  }, [generateOne]);

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
