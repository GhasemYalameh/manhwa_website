"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getCoverUrl, type ManhwaApiItem } from "@/lib/api/manhwa";

interface HeroBannerProps {
  items: ManhwaApiItem[];
}

const AUTOPLAY_INTERVAL_MS = 6000;

export function HeroBanner({ items }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex((index + items.length) % items.length);
    },
    [items.length]
  );

  // اتوپلی — با هاور روی بنر متوقف میشه، با خروج موس دوباره ادامه پیدا می‌کنه
  useEffect(() => {
    if (isPaused || items.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPaused, items.length]);

  if (items.length === 0) return null;

  return (
    <section
      className="mx-auto mt-4 max-w-[1400px] px-4 lg:px-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-card sm:aspect-[16/7] sm:min-h-[220px]">
        {items.map((item, index) => (
          <div
            key={item.slug}
            className={`absolute inset-0 transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getCoverUrl(item.hero_cover ?? item.cover)}
              alt={item.fa_title || item.en_title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 lg:p-10">
              <h2 className="mb-3 max-w-lg text-xl font-bold text-white lg:text-3xl">
                {item.fa_title || item.en_title}
              </h2>
              <Link
                href={`/manhwa/${item.slug}`}
                className="inline-block rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                شروع مطالعه
              </Link>
            </div>
          </div>
        ))}

        {/* نقاط ناوبری */}
        {items.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2">
            {items.map((item, index) => (
              <button
                key={item.slug}
                type="button"
                aria-label={`اسلاید ${index + 1}`}
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all ${index === activeIndex ? "w-6 bg-accent" : "w-2 bg-white/60 hover:bg-white/80"
                  }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
