import { MangaCard } from "@/components/manga/MangaCard";
import { getCoverUrl } from "@/lib/api/manhwa";
import type { PublicProfileManhwaItem } from "@/lib/api/publicProfile";
import { MangaCardGrid } from "@/components/manga/MangaCardGrid";

interface PublicInterestedManhwasProps {
  items: PublicProfileManhwaItem[];
}

export function PublicInterestedManhwas({ items }: PublicInterestedManhwasProps) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <h2 className="mb-4 text-lg font-bold text-text-primary">مورد علاقه (امتیاز ۴ و ۵)</h2>
      <MangaCardGrid>
        {items.map((item) => (
          <MangaCard
            key={item.slug}
            slug={item.slug}
            coverUrl={getCoverUrl(item.cover)}
            title={item.fa_title || item.en_title}
            viewsCount={item.views_count}
            commentsCount={item.comments_count}
            isHot={item.is_hot}
            publicationStatus={item.publication_status}
          />
        ))}
      </MangaCardGrid>
    </section>
  );
}
