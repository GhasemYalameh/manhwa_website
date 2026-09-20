import Link from "next/link";
import { StarIcon, FlameSolidIcon, EyeIcon, CommentIcon } from "@/components/icons";
import {
  type PublicationStatus,
  PUBLICATION_STATUS_LABEL as STATUS_LABEL,
  PUBLICATION_STATUS_COLOR as STATUS_COLOR,
} from "@/lib/constants/publicationStatus";

export type { PublicationStatus };

export interface MangaCardProps {
  slug: string; // lookup_field بک‌اند title_slug هست، نه id
  coverUrl: string;
  title: string;
  rating?: number;
  chaptersCount?: number;
  viewsCount: number;
  commentsCount: number;
  isHot: boolean;
  publicationStatus?: PublicationStatus; // cp: در حال پخش | c: پایان‌یافته | up: منتشرنشده
}

export function MangaCard({
  slug,
  coverUrl,
  title,
  rating,
  chaptersCount,
  viewsCount,
  commentsCount,
  isHot,
  publicationStatus,
}: MangaCardProps) {
  return (
    <Link href={`/manhwa/${slug}`} className="group block rounded-card bg-surface">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-card p-1 pb-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl}
          alt={title}
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-card bg-gradient-to-b from-black/80 to-transparent" />

        {isHot && (
          <span className="absolute left-2 top-2">
            <FlameSolidIcon className="h-6 w-6 text-error" />
          </span>
        )}

        {publicationStatus && (
          <span
            className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white sm:px-2.5 sm:py-1 sm:text-[11px] ${STATUS_COLOR[publicationStatus]}`}
          >
            {STATUS_LABEL[publicationStatus]}
          </span>
        )}

        {typeof chaptersCount === "number" && chaptersCount > 0 && (
          <span className="absolute bottom-2 right-2 rounded-lg bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">
            {chaptersCount.toLocaleString("fa-IR")} قسمت
          </span>
        )}

        {typeof rating === "number" && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-lg bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">
            {rating.toFixed(1)}
            <StarIcon className="h-3 w-3 text-warning" />
          </span>
        )}
      </div>

      <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3">
        <h3 className="mt-2 truncate text-sm font-medium text-text-primary" dir="auto" title={title}>
          {title}
        </h3>

        <div className="mt-1.5 flex items-center gap-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <EyeIcon className="h-3.5 w-3.5" />
            {viewsCount.toLocaleString("fa-IR")}
          </span>
          <span className="flex items-center gap-1">
            <CommentIcon className="h-3.5 w-3.5" />
            {commentsCount.toLocaleString("fa-IR")}
          </span>
        </div>
      </div>
    </Link>
  );
}