"use client";

import type { RealestateStatus, RealestateTopic } from "@/lib/types";

interface RealestateSectionProps {
  status: RealestateStatus;
}

const TOPIC_ICONS: Record<RealestateTopic, string> = {
  재개발: "🏗️",
  아파트: "🏢",
  꼬마빌딩: "🏬",
  "상업용 부동산": "🏙️",
};

export function RealestateSection({ status }: RealestateSectionProps) {
  if (status.state === "idle") return null;

  if (status.state === "loading") {
    return (
      <section className="mt-10 mb-4">
        <h2 className="font-bold text-lg mb-4" style={{ color: "var(--navy)" }}>
          📌 한국 부동산 뉴스
        </h2>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-24 rounded mb-2" style={{ backgroundColor: "var(--rule)" }} />
              <div className="h-3 w-full rounded mb-1" style={{ backgroundColor: "var(--rule)" }} />
              <div className="h-3 w-4/5 rounded" style={{ backgroundColor: "var(--rule)" }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (status.state === "error") {
    return (
      <section className="mt-10 mb-4">
        <h2 className="font-bold text-lg mb-2" style={{ color: "var(--navy)" }}>
          📌 한국 부동산 뉴스
        </h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          불러오기 실패: {status.message}
        </p>
      </section>
    );
  }

  // ready
  const { data } = status;
  const visibleTopics = data.topics.filter((t) => t.articles.length > 0);

  if (visibleTopics.length === 0) {
    return (
      <section className="mt-10 mb-4">
        <h2 className="font-bold text-lg mb-2" style={{ color: "var(--navy)" }}>
          📌 한국 부동산 뉴스
        </h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          최근 36시간 내 관련 기사가 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 mb-4">
      <h2 className="font-bold text-lg mb-6" style={{ color: "var(--navy)" }}>
        📌 한국 부동산 뉴스
      </h2>
      <div className="space-y-6">
        {visibleTopics.map(({ topic, articles }) => (
          <div key={topic}>
            <h3 className="font-bold text-sm mb-2">
              {TOPIC_ICONS[topic]} {topic}
            </h3>
            <ol className="space-y-1 list-none">
              {articles.map((article, idx) => (
                <li key={idx} className="text-sm">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-70 transition-opacity"
                    style={{ color: "var(--foreground)" }}
                  >
                    {article.title}
                  </a>
                  <span className="ml-1 text-xs" style={{ color: "var(--muted)" }}>
                    — {article.outlet}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs" style={{ color: "var(--muted)" }}>
        연합뉴스 · 뉴시스 · 비즈워치 기준
      </p>
    </section>
  );
}
