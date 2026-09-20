import Link from "next/link";
import { EyeIcon } from "@/components/icons";
import { getCoverUrl, type ManhwaApiItem } from "@/lib/api/manhwa";

interface TopThisWeekSectionProps {
  items: ManhwaApiItem[];
}

export function TopThisWeekSection({ items }: TopThisWeekSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">پربازدیدترین ها</h2>
      </div>
      <ol className="flex flex-col divide-y divide-divider overflow-hidden rounded-card bg-surface">
        {items.map((item, index) => (
          <li key={item.slug}>
            <Link
              href={`/manhwa/${item.slug}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent-light"
            >
              <span
                className={`w-6 shrink-0 text-center text-lg font-extrabold ${index < 3 ? "text-accent" : "text-text-secondary"
                  }`}
              >
                {index + 1}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCoverUrl(item.cover)}
                alt={item.fa_title || item.en_title}
                className="h-14 w-10 shrink-0 rounded object-cover"
              />
              <span dir="auto" className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                {item.fa_title || item.en_title}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs text-text-secondary">
                <EyeIcon className="h-5 w-5" />
                {item.views_count.toLocaleString("fa-IR")}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
