import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { PaginatedResponse } from "./manhwa";

export interface CommentAuthor {
  id: string;
  first_name: string;
  is_subscriber: boolean;
  avatar: string | null;
}

export type CommentReaction = "lk" | "dlk";

export interface CommentApiItem {
  id: number;
  manhwa_slug: string;
  author: CommentAuthor;
  text: string;
  parent: number | null;
  level: number;
  likes_count: number;
  dis_likes_count: number;
  replies_count: number;
  user_reaction: CommentReaction | null;
  is_spoiler: boolean;
}

export function getComments(
  manhwaSlug: string,
  page = 1
): Promise<PaginatedResponse<CommentApiItem>> {
  // endpoint خودش AllowAny هست؛ auth: true فقط باعث میشه اگه کاربر لاگین بود توکن هم فرستاده بشه
  // تا user_reaction (اکشن list) درست annotate بشه — اگه لاگین نبود، رفتار قبلی بدون تغییر می‌مونه
  return apiGet<PaginatedResponse<CommentApiItem>>(
    `/api/manhwas/${manhwaSlug}/comments/?page=${page}`,
    { auth: true }
  );
}

export function getComment(manhwaSlug: string, id: number): Promise<CommentApiItem> {
  return apiGet<CommentApiItem>(`/api/manhwas/${manhwaSlug}/comments/${id}/`);
}

export function getCommentReplies(
  manhwaSlug: string,
  commentId: number
): Promise<CommentApiItem[]> {
  return apiGet<CommentApiItem[]>(
    `/api/manhwas/${manhwaSlug}/comments/${commentId}/replies/`
  );
}

export interface CreateCommentResponse {
  id: number;
  author: CommentAuthor;
  text: string;
  parent: number | null;
  is_spoiler: boolean;
}

export function createComment(
  manhwaSlug: string,
  text: string,
  parent: number | null = null,
  isSpoiler = false
): Promise<CreateCommentResponse> {
  return apiPost<CreateCommentResponse>(
    `/api/manhwas/${manhwaSlug}/comments/`,
    { text, parent, is_spoiler: isSpoiler },
    { auth: true }
  );
}

export interface ReactionResponse {
  action: "created" | "updated" | "deleted";
  comment: { likes_count: number; dis_likes_count: number };
  reaction: { reaction: CommentReaction } | null;
}

export function toggleCommentReaction(
  manhwaSlug: string,
  commentId: number,
  reaction: CommentReaction
): Promise<ReactionResponse> {
  return apiPost<ReactionResponse>(
    `/api/manhwas/${manhwaSlug}/comments/${commentId}/reaction/`,
    { reaction },
    { auth: true }
  );
}

export interface MyCommentManhwaRef {
  en_title: string;
  fa_title: string;
  title_slug: string;
}

export interface MyCommentApiItem {
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

// توجه: بک‌اند فعلاً آرایه‌ی flat برمی‌گردونه، نه پیجینیت‌شده — اگه بعداً پیجینیشن اضافه شد این تابع باید Promise<PaginatedResponse<MyCommentApiItem>> برگردونه
export function getMyComments(): Promise<MyCommentApiItem[]> {
  return apiGet<MyCommentApiItem[]>(`/api/comments/mine/`, { auth: true });
}

// زنجیره‌ی کامنت هدف تا ریشه (برای دیپ‌لینک نوتیفیکیشن) — یک درخواست به‌جای حلقه‌ی قبلی
export function getCommentChain(
  manhwaSlug: string,
  commentId: number
): Promise<CommentApiItem[]> {
  return apiGet<CommentApiItem[]>(
    `/api/manhwas/${manhwaSlug}/comments/${commentId}/chain/`,
    { auth: true }
  );
}

export function updateComment(
  manhwaSlug: string,
  commentId: number,
  text: string
): Promise<{ text: string }> {
  return apiPatch<{ text: string }>(
    `/api/manhwas/${manhwaSlug}/comments/${commentId}/`,
    { text },
    { auth: true }
  );
}

export function deleteComment(manhwaSlug: string, commentId: number): Promise<void> {
  return apiDelete(`/api/manhwas/${manhwaSlug}/comments/${commentId}/`, { auth: true });
}