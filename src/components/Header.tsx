"use client";

interface HeaderProps {
  dateLabel: string;
  isLoading: boolean;
  hasResults: boolean;
  onGenerate: () => void;
}

export function Header({ dateLabel, isLoading, hasResults, onGenerate }: HeaderProps) {
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

      <button
        type="button"
        onClick={onGenerate}
        disabled={isLoading}
        className="mt-6 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[var(--rule)]"
        style={{ borderColor: "var(--foreground)" }}
      >
        {buttonLabel}
      </button>
    </header>
  );
}
