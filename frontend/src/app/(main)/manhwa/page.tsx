import Link from "next/link";
import { MangaCard } from "@/components/manga/MangaCard";
import { BrowseFilters } from "@/components/manga/BrowseFilters";
import { getManhwas, getCoverUrl } from "@/lib/api/manhwa";
import { getGenres } from "@/lib/api/genre";
import { getStudios } from "@/lib/api/studio";
import { MangaCardGrid } from "@/components/manga/MangaCardGrid";

interface BrowsePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const PAGE_SIZE = 10; // پیش‌فرض پیجینیشن بک‌اند

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const sp = await searchParams;

  const search = getParam(sp.search);
  const dayOfWeek = getParam(sp.day_of_week);
  const genresParam = getParam(sp.genres);
  const studioParam = getParam(sp.studio);
  const ordering = getParam(sp.ordering) ?? "-publication_datetime";
  const page = Number(getParam(sp.page) ?? "1");

  const [manhwasRes, genres, studios] = await Promise.all([
    getManhwas({
      search: search || undefined,
      day_of_week: dayOfWeek || undefined,
      genres: genresParam || undefined,
      studio: studioParam || undefined,
      ordering,
      page,
    }),
    getGenres(),
    getStudios(),
  ]);

  const totalPages = Math.max(1, Math.ceil(manhwasRes.count / PAGE_SIZE));

  function pageHref(newPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (dayOfWeek) params.set("day_of_week", dayOfWeek);
    if (genresParam) params.set("genres", genresParam);
    if (studioParam) params.set("studio", studioParam);
    if (ordering) params.set("ordering", ordering);
    if (newPage > 1) params.set("page", String(newPage));
    const qs = params.toString();
    return `/manhwa${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="min-h-screen bg-bg">
      <section className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
        <h1 className="mb-6 text-xl font-bold text-text-primary">مانهواها</h1>

        <BrowseFilters genres={genres} studios={studios} />

        {manhwasRes.results.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-secondary">موردی پیدا نشد.</p>
        ) : (
          <MangaCardGrid>
            {manhwasRes.results.map((item) => (
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
          </MangaCardGrid>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Link
              href={pageHref(Math.max(1, page - 1))}
              aria-disabled={page === 1}
              className={`rounded-card border border-divider px-3 py-1.5 text-sm text-text-primary ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              قبلی
            </Link>
            <span className="text-sm text-text-secondary">
              {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
            </span>
            <Link
              href={pageHref(Math.min(totalPages, page + 1))}
              aria-disabled={page === totalPages}
              className={`rounded-card border border-divider px-3 py-1.5 text-sm text-text-primary ${page === totalPages ? "pointer-events-none opacity-40" : ""}`}
            >
              بعدی
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

