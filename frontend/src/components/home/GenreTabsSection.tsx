"use client";

import { useEffect, useState } from "react";
import { MangaCard } from "@/components/manga/MangaCard";
import { getManhwas, getCoverUrl, type ManhwaApiItem } from "@/lib/api/manhwa";
import type { GenreApiItem } from "@/lib/api/genre";
import { MangaCardCarousel } from "@/components/manga/MangaCardCarousel";

interface GenreTabsSectionProps {
  genres: GenreApiItem[];
}

export function GenreTabsSection({ genres }: GenreTabsSectionProps) {
  const [activeGenreId, setActiveGenreId] = useState<number | null>(
    genres[0]?.id ?? null
  );
  const [items, setItems] = useState<ManhwaApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (activeGenreId === null) return;
    let cancelled = false;
    setIsLoading(true);
    getManhwas({ genres: String(activeGenreId) })
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
  }, [activeGenreId]);

  if (genres.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">ژانرها</h2>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {genres.map((genre) => (
          <button
            key={genre.id}
            type="button"
            onClick={() => setActiveGenreId(genre.id)}
            className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs transition-colors lg:rounded-full lg:px-4 lg:py-2 lg:text-sm ${activeGenreId === genre.id
              ? "border-accent bg-accent text-white"
              : "border-divider bg-surface text-text-secondary hover:border-accent hover:text-accent"
              }`}
          >
            {genre.title}
          </button>
        ))}
      </div>

      <div className={`mt-5 transition-opacity duration-200 ${isLoading ? "opacity-50" : "opacity-100"}`}>
        {!isLoading && items.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">
            موردی برای این ژانر پیدا نشد.
          </p>
        ) : (
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
          </MangaCardCarousel>
        )}
      </div>
    </section>
  );
}