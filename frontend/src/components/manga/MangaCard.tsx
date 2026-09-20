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
  lastUpload: string; // مثل "S01-E03"
  viewsCount: number;
  commentsCount: number;
  isHot: boolean;
  publicationStatus?: PublicationStatus; // cp: در حال پخش | c: پایان‌یافته | up: منتشرنشده (بج نشون داده نمیشه)
}


export function MangaCard({
  slug,
  coverUrl,
  title,
  rating,
  lastUpload,
  viewsCount,
  commentsCount,
  isHot,
  publicationStatus,
}: MangaCardProps) {
  return (
    <Link href={`/manhwa/${slug}`} className="group block bg-surface rounded-card">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-card p-1 pb-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl}
          alt={title}
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 backdrop-blur-lg"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0  rounded-t-card h-16 bg-gradient-to-b from-black/80 to-transparent" />

        {isHot && (
          <span className="absolute top-2 left-2">
            <FlameSolidIcon className="h-6 w-6 text-error" />
          </span>
        )}

        {publicationStatus && (
          <span
            className={`absolute top-2 right-2 rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${STATUS_COLOR[publicationStatus]}`}
          >
            {STATUS_LABEL[publicationStatus]}
          </span>
        )}

        {typeof rating === "number" && (
          <span className="absolute bottom-3 left-3 flex gap-1 rounded-xl pl-1 pr-2 pb-0.5 pt-1 text-[14px] font-semibold text-white bg-divider">
            {rating.toFixed(1)}
            <StarIcon className="text-warning" />
          </span>
        )}
      </div>
      <div className="p-3 pt-0">
        <h3 className="mt-2 mb-1 truncate text-sm font-medium text-text-primary" dir="auto" title={title}>
          {title}
        </h3>

        <div className="mt-4 flex items-center justify-between text-xs text-text-secondary">
          <span>{lastUpload !== "Not Uploaded" ? lastUpload : "آپلود نشده"}</span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <EyeIcon className="h-3.5 w-3.5" />
              {viewsCount}
            </span>
            <span className="flex items-center gap-1">
              <CommentIcon className="h-3.5 w-3.5" />
              {commentsCount}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}