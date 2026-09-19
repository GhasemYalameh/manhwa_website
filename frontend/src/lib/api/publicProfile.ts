import { apiGet } from "./client";
import type { MyCommentManhwaRef } from "./comment";

const PUBLIC_PROFILE_PREFIX = "/api/account/profile";

export interface PublicProfileComment {
  id: number;
  manhwa: MyCommentManhwaRef;
  text: string;
  is_spoiler: boolean;
  parent: number | null;
  level: number;
  likes_count: number;
  dis_likes_count: number;
  replies_count: number;
  created_at: string;
}

// توجه: این شکل با ManhwaApiItem استاندارد فرق داره — avg_rating نداره، hero_cover داره
export interface PublicProfileManhwaItem {
  slug: string;
  fa_title: string;
  en_title: string;
  is_hot: boolean;
  season: number;
  day_of_week: string;
  publication_status: "cp" | "c" | "up";
  last_upload: string;
  last_upload_time: string;
  views_count: number;
  comments_count: number;
  cover: string;
  hero_cover: string | null;
}

export interface PublicProfileApiItem {
  first_name: string;
  avatar: string | null;
  bio: string;
  date_joined: string;
  is_subscriber: boolean;
  finished_manhwa_count: number;
  now_following_manhwa_count: number;
  will_reading_manhwa_count: number;
  total_comments: number;
  total_manhwa_viewed: number;
  total_manhwa_rated: number;
  last_comments: PublicProfileComment[];
  interested_manhwas: PublicProfileManhwaItem[];
}

// فرض شده AllowAny باشه (چون قراره از کامنت‌ها/تیکت‌ها لینک بشه)؛ اگه بک‌اند نیاز به auth داشت، این تابع باید { auth: true } بگیره
export function getPublicProfile(uuid: string): Promise<PublicProfileApiItem> {
  return apiGet<PublicProfileApiItem>(`${PUBLIC_PROFILE_PREFIX}/${uuid}/`);
}