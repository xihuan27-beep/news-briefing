"use client";

interface HeaderProps {
  dateLabel: string;
  isLoading: boolean;
  hasResults: boolean;
  cachedAt: string | null;
  onGenerate: () => void;
}

function formatCachedAt(iso: string): string {
  // ISO 타임스탬프 → 한국시간 "오전/오후 H:MM 자동 생성"
  const date = new Date(iso);
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const rawH = kst.getUTCHours();
  const period = rawH < 12 ? "오전" : "오후";
  const h = String(rawH % 12 || 12).padStart(2, "0");
  const m = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${period} ${h}:${m} 자동 생성`;
}

export function Header({
  dateLabel,
  isLoading,
  hasResults,
  cachedAt,
  onGenerate,
}: HeaderProps) {
  const buttonLabel = isLoading
    ? "생성 중…"
    : hasResults
      ? "다시 생성"
      : "오늘의 브리핑 생성";

  return (
    <header className="pt-12 pb-8 sm:pt-16 sm:pb-10">
      <h1
        className="font-bold tracking-tight text-3xl sm:text-4xl"
        style={{ color: "var(--navy)" }}
      >
        Daily Briefing
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        {dateLabel} · 한국시간 기준
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[var(--rule)]"
          style={{ borderColor: "var(--foreground)" }}
        >
          {buttonLabel}
        </button>

        {cachedAt && !isLoading && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {formatCachedAt(cachedAt)}
          </span>
        )}

        {!hasResults && !isLoading && !cachedAt && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            매일 오전 5시 자동 생성
          </span>
        )}
      </div>
    </header>
  );
}
