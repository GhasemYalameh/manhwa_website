"use client";

import { useEffect, useState } from "react";
import { MangaCard } from "@/components/manga/MangaCard";
import { getManhwas, getCoverUrl, type ManhwaApiItem } from "@/lib/api/manhwa";
import { MangaCardGrid } from "@/components/manga/MangaCardGrid";

const DAYS: { value: string; label: string }[] = [
  { value: "sat", label: "شنبه" },
  { value: "sun", label: "یکشنبه" },
  { value: "mon", label: "دوشنبه" },
  { value: "tue", label: "سه‌شنبه" },
  { value: "wed", label: "چهارشنبه" },
  { value: "thu", label: "پنج‌شنبه" },
  { value: "fri", label: "جمعه" },
];

// نگاشت getDay() جاوااسکریپت (۰=یکشنبه) به کد day_of_week بک‌اند
const JS_DAY_TO_CODE = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getTodayCode(): string {
  return JS_DAY_TO_CODE[new Date().getDay()];
}

export function WeeklyCalendar() {
  const [activeDay, setActiveDay] = useState(getTodayCode());
  const [items, setItems] = useState<ManhwaApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getManhwas({ day_of_week: activeDay })
      .then((res) => {
        if (!cancelled) setItems(res.results);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDay]);

  const todayCode = getTodayCode();

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <h1 className="mb-6 text-xl font-bold text-text-primary">پخش هفتگی</h1>

      <div className="flex flex-wrap gap-2">
        {DAYS.map((day) => (
          <button
            key={day.value}
            type="button"
            onClick={() => setActiveDay(day.value)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${activeDay === day.value
                ? "border-accent bg-accent text-white"
                : "border-divider bg-surface text-text-secondary hover:border-accent hover:text-accent"
              }`}
          >
            {day.label}
            {day.value === todayCode && (
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
            )}
          </button>
        ))}
      </div>

      <div className={`mt-6 transition-opacity duration-200 ${isLoading ? "opacity-50" : "opacity-100"}`}>
        <MangaCardGrid>
          {!isLoading && items.length === 0 ? (
            <p className="col-span-full py-12 text-center text-sm text-text-secondary">
              برای این روز موردی پخش نمی‌شود.
            </p>
          ) : (
            items.map((item) => (
              <MangaCard
                key={item.slug}
                slug={item.slug}
                coverUrl={getCoverUrl(item.cover)}
                title={item.fa_title || item.en_title}
                rating={item.avg_rating ? Number(item.avg_rating) : undefined}
                chaptersCount={item.chapters_count}
                viewsCount={item.views_count}
                commentsCount={item.comments_count}
                isHot={item.is_hot}
                publicationStatus={item.publication_status}
              />
            ))
          )}
        </MangaCardGrid>
      </div>
    </section>
  );
}
