import { apiGet } from "./client";
import { type PublicationStatus } from "@/lib/constants/publicationStatus";

const MANHWA_PREFIX = "/api";
const BASE_MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "http://localhost/";

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// شکل واقعی ManhwaSerializer از بک‌اند
export interface ManhwaApiItem {
  slug: string;
  en_title: string;
  fa_title: string;
  avg_rating: string;
  season: number;
  day_of_week: string;
  publication_status: "cp" | "c" | "up";
  last_upload: string;
  created_datetime: string;
  views_count: number;
  comments_count: number;
  chapters_count?: number;
  hero_cover?: string | null;
  cover: string;
  is_hot: boolean;
}

export interface GetManhwasParams {
  ordering?: string; // "publication_datetime" | "avg_rating" (با پیشوند - برای نزولی)
  search?: string;
  day_of_week?: string;
  genres?: string;
  studio?: string;
  page?: number;
}

export function getManhwas(
  params: GetManhwasParams = {}
): Promise<PaginatedResponse<ManhwaApiItem>> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const qs = query.toString();
  return apiGet<PaginatedResponse<ManhwaApiItem>>(
    `${MANHWA_PREFIX}/manhwas/${qs ? `?${qs}` : ""}`
  );
}


export function getCoverUrl(cover: string): string {
  return `${BASE_MEDIA_URL}${cover}`;
}

export interface StudioRef {
  id: number;
  title: string;
  description: string;
}

export interface GenreRef {
  id: number;
  title: string;
  description: string;
}
// شکل واقعی DetailManhwaSerializer
export interface ManhwaDetailApiItem {
  en_title: string;
  fa_title: string;
  summary: string;
  genres: GenreRef[];
  rating_data: {
    avg_rating: string;
    raters_count: number;
    fives_count: number;
    fours_count: number;
    threes_count: number;
    twos_count: number;
    ones_count: number;
  };
  season: number;
  day_of_week: string;
  last_upload: string;
  studio: StudioRef;
  views_count: number;
  comments_count: number;
  cover: string;
  publication_datetime: string;
  publication_status: PublicationStatus;
  is_hot: boolean;
  last_upload_time: string;
}


export function getTodayManhwas(): Promise<ManhwaApiItem[]> {
  return apiGet<ManhwaApiItem[]>(`${MANHWA_PREFIX}/manhwas/today/`);
}

export function getManhwaBySlug(slug: string): Promise<ManhwaDetailApiItem> {
  return apiGet<ManhwaDetailApiItem>(`${MANHWA_PREFIX}/manhwas/${slug}/`);
}