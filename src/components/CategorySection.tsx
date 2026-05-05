import type { BriefingItem } from "@/lib/types";

interface Props {
  item: BriefingItem;
}

export function CategorySection({ item }: Props) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="font-bold text-base">{item.category}</h3>
      <p className="mt-1.5 leading-relaxed text-[15px]">{item.body}</p>
      <p className="mt-2 leading-relaxed text-[14px]" style={{ color: "var(--muted)" }}>
        <span className="font-bold" style={{ color: "var(--foreground)" }}>
          선정 이유:{" "}
        </span>
        {item.reason}
      </p>
      {item.sources.length > 0 && (
        <ol className="mt-2 space-y-0.5 text-[13px]" style={{ color: "var(--muted)" }}>
          {item.sources.map((src, idx) => (
            <li key={`${src.url}-${idx}`}>
              [{idx + 1}]{" "}
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--foreground)" }}
              >
                {src.label}
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
