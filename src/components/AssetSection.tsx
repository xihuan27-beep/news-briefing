"use client";

import type { AssetStatus, AssetTrendItem, ExchangeRateItem } from "@/lib/types";

const UP = "#1A7F37";
const DOWN = "#C0392B";

function ReturnChip({ label, value }: { label: string; value: number }) {
  const color = value > 0 ? UP : value < 0 ? DOWN : "var(--muted)";
  const sign = value > 0 ? "+" : "";
  return (
    <span className="inline-flex items-baseline gap-1 text-xs whitespace-nowrap">
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ color }}>
        {sign}
        {value.toFixed(2)}%
      </span>
    </span>
  );
}

function TrendList({ items }: { items: AssetTrendItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        데이터를 불러오지 못했습니다.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.code} className="border-b pb-3 last:border-b-0" style={{ borderColor: "var(--rule)" }}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold text-sm">{item.name}</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {item.code}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {item.returns.map((r) => (
              <ReturnChip key={r.label} label={r.label} value={r.value} />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ExchangeRateGrid({ rates }: { rates: ExchangeRateItem[] }) {
  if (rates.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        데이터를 불러오지 못했습니다.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {rates.map((r) => (
        <div key={r.label} className="rounded-md border px-3 py-2" style={{ borderColor: "var(--rule)" }}>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {r.label}
          </div>
          <div className="mt-0.5 font-bold text-sm tabular-nums">
            {r.rate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-4 w-full rounded" style={{ backgroundColor: "var(--rule)" }} />
      ))}
    </div>
  );
}

export function AssetSection({ status }: { status: AssetStatus }) {
  if (status.state === "idle") return null;

  return (
    <section className="mt-10 mb-10 pt-8 border-t" style={{ borderColor: "var(--rule)" }}>
      <h2 className="font-bold text-lg mb-1" style={{ color: "var(--navy)" }}>
        💹 자산 현황
      </h2>
      <p className="text-xs mb-6" style={{ color: "var(--muted)" }}>
        수익률만 표시 · 금액·수량은 비공개
      </p>

      {status.state === "loading" && <LoadingBlock />}

      {status.state === "error" && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          불러오기 실패: {status.message}
        </p>
      )}

      {status.state === "ready" && (
        <div className="space-y-8">
          <div>
            <h3 className="font-bold text-sm mb-3">📈 주요 종목 단가 추이</h3>
            <TrendList items={status.data.priceTrend} />
          </div>

          <div>
            <h3 className="font-bold text-sm mb-3">🎯 집중 관리 단가 추이</h3>
            <TrendList items={status.data.focusTrend} />
          </div>

          <div>
            <h3 className="font-bold text-sm mb-3">💱 환율 대시보드</h3>
            <ExchangeRateGrid rates={status.data.exchangeRates} />
          </div>
        </div>
      )}
    </section>
  );
}
