interface Props {
  state: "idle" | "loading" | "ready" | "error";
  text?: string;
  errorMessage?: string;
}

export function SummaryCard({ state, text, errorMessage }: Props) {
  return (
    <section
      className="mt-12 border-t pt-8 pb-16"
      style={{ borderColor: "var(--rule)" }}
    >
      <h2 className="font-bold text-xl">📌 오늘의 핵심 관통 주제</h2>
      <div className="mt-3 leading-relaxed text-[15px]">
        {state === "idle" && (
          <p style={{ color: "var(--muted)" }}>
            10개국 브리핑 생성 후 자동으로 작성됩니다.
          </p>
        )}
        {state === "loading" && (
          <div className="space-y-1.5 animate-pulse">
            <div
              className="h-3 w-full rounded"
              style={{ backgroundColor: "var(--rule)" }}
            />
            <div
              className="h-3 w-11/12 rounded"
              style={{ backgroundColor: "var(--rule)" }}
            />
            <div
              className="h-3 w-3/4 rounded"
              style={{ backgroundColor: "var(--rule)" }}
            />
          </div>
        )}
        {state === "ready" && <p>{text}</p>}
        {state === "error" && (
          <p style={{ color: "var(--muted)" }}>
            관통 주제 생성 실패: {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}
