"use client";

import { useEffect, useState } from "react";
import { MangaCard } from "@/components/manga/MangaCard";
import { getAccessToken } from "@/lib/api/client";
import { getWatchList } from "@/lib/api/watchlist";
import { getCoverUrl, type ManhwaApiItem } from "@/lib/api/manhwa";
import { MangaCardCarousel } from "@/components/manga/MangaCardCarousel";

const MAX_ITEMS = 6;

export function ContinueReadingSection() {
  const [items, setItems] = useState<ManhwaApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;

    getWatchList()
      .then((res) => {
        if (cancelled) return;
        const nowReading = res.results
          .filter((w) => w.watching_status === "nr")
          .slice(0, MAX_ITEMS)
          .map((w) => w.manhwa);
        setItems(nowReading);
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
  }, []);

  if (isLoading || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">ادامه مطالعه</h2>
      </div>
      <MangaCardCarousel>
        {items.map((item) => (
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
        ))}
      </MangaCardCarousel >
    </section>
  );
}