import type { BriefingStatus } from "@/lib/types";
import type { CountryConfig } from "@/lib/countries";
import { CategorySection } from "./CategorySection";

interface Props {
  country: CountryConfig;
  status: BriefingStatus;
  onRetry?: () => void;
}

export function CountryCard({ country, status, onRetry }: Props) {
  return (
    <article
      id={`country-${country.id}`}
      className="border-t pt-8 pb-2 first:border-t-0 first:pt-0"
      style={{ borderColor: "var(--rule)" }}
    >
      <header>
        <h2 className="font-bold text-xl tracking-tight">
          <span aria-hidden className="mr-2 text-2xl">
            {country.flag}
          </span>
          {country.name}
        </h2>
        <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
          {country.outlets}
        </p>
      </header>

      <div className="mt-5">
        {status.state === "idle" && (
          <p className="text-[14px]" style={{ color: "var(--muted)" }}>
            아직 생성되지 않았습니다.
          </p>
        )}

        {status.state === "loading" && <CardSkeleton />}

        {status.state === "ready" &&
          status.data.items.map((item) => (
            <CategorySection key={item.category} item={item} />
          ))}

        {status.state === "error" && (
          <div className="text-[14px]" style={{ color: "var(--muted)" }}>
            <p>
              불러오기 실패: <span>{status.message}</span>
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 underline"
                style={{ color: "var(--foreground)" }}
              >
                다시 시도
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div
            className="h-4 w-16 rounded"
            style={{ backgroundColor: "var(--rule)" }}
          />
          <div
            className="mt-2 h-3 w-full rounded"
            style={{ backgroundColor: "var(--rule)" }}
          />
          <div
            className="mt-1.5 h-3 w-4/5 rounded"
            style={{ backgroundColor: "var(--rule)" }}
          />
        </div>
      ))}
    </div>
  );
}
