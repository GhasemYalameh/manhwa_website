"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { CommentForm } from "@/components/manga/CommentForm";
import { CommentItem } from "@/components/manga/CommentItem";
import { getComments, getCommentChain, createComment, type CommentApiItem } from "@/lib/api/comment";
import { getMe } from "@/lib/api/auth";

interface CommentListProps {
  manhwaSlug: string;
  highlightCommentId?: number;
}

const PAGE_SIZE = 10;

export function CommentList({ manhwaSlug, highlightCommentId }: CommentListProps) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<CommentApiItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [chainPath, setChainPath] = useState<CommentApiItem[]>([]);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState(false);

  useEffect(() => {
    const loggedIn = !!getAccessToken();
    setIsLoggedIn(loggedIn);
    if (!loggedIn) return;
    getMe()
      .then((profile) => setCurrentUserId(profile.id))
      .catch(() => { });
  }, []);

  // بارگذاری اولیه‌ی صفحه‌ی ۱ — کاملاً سمت کلاینت (دیگه از سرور initialComments نمی‌گیریم)
  // تا اگه کاربر لاگین بود، user_reaction از همون اول درست بیاد، نه فقط بعد از رفتن به صفحه‌ی بعد
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getComments(manhwaSlug, 1)
      .then((res) => {
        if (cancelled) return;
        setComments(res.results);
        setTotalCount(res.count);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) showToast("خطا در دریافت نظرات.", "error");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manhwaSlug]);

  useEffect(() => {
    if (!highlightCommentId) return;
    let cancelled = false;
    setChainLoading(true);
    setChainError(false);

    getCommentChain(manhwaSlug, highlightCommentId)
      .then((chain) => {
        if (cancelled) return;
        // خروجی بک‌اند رو بر اساس level مرتب می‌کنیم تا همیشه ریشه → هدف باشه، صرف‌نظر از ترتیب برگشتی API
        const sorted = [...chain].sort((a, b) => a.level - b.level);
        setChainPath(sorted);
      })
      .catch(() => {
        if (!cancelled) setChainError(true);
      })
      .finally(() => {
        if (!cancelled) setChainLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [highlightCommentId, manhwaSlug]);

  async function goToPage(newPage: number) {
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    if (newPage < 1 || newPage > totalPages || newPage === page || isLoading) return;
    setIsLoading(true);
    try {
      const res = await getComments(manhwaSlug, newPage);
      setComments(res.results);
      setTotalCount(res.count);
      setPage(newPage);
    } catch {
      showToast("خطا در دریافت نظرات.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNewComment(text: string, isSpoiler: boolean) {
    try {
      const created = await createComment(manhwaSlug, text, null, isSpoiler);
      const newComment: CommentApiItem = {
        id: created.id,
        manhwa_slug: manhwaSlug,
        author: created.author,
        text: created.text,
        parent: created.parent,
        level: 0,
        likes_count: 0,
        dis_likes_count: 0,
        replies_count: 0,
        user_reaction: null,
        is_spoiler: created.is_spoiler,
      };
      if (page === 1) {
        setComments((prev) => [newComment, ...prev]);
      }
      setTotalCount((prev) => prev + 1);
      showToast("نظر شما ثبت شد.", "success");
    } catch {
      showToast("ثبت نظر با خطا مواجه شد. ممکن است این متن قبلاً ثبت شده باشد.", "error");
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">
          نظرات <span className="text-text-secondary">({totalCount.toLocaleString("fa-IR")})</span>
        </h2>
      </div>

      {isLoggedIn ? (
        <div className="mb-6 rounded-card bg-surface p-4">
          <CommentForm onSubmit={handleNewComment} submitLabel="ارسال نظر" />
        </div>
      ) : (
        <p className="mb-6 text-sm text-text-secondary">برای ثبت نظر ابتدا وارد حساب کاربری خود شوید.</p>
      )}

      {highlightCommentId && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium text-text-secondary">نظر لینک‌شده:</p>
          {chainLoading ? (
            <p className="text-sm text-text-secondary">در حال بارگذاری نظر...</p>
          ) : chainError || chainPath.length === 0 ? (
            <p className="text-sm text-text-secondary">این نظر پیدا نشد یا حذف شده است.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              <CommentItem
                manhwaSlug={manhwaSlug}
                comment={chainPath[0]}
                replyChain={chainPath.slice(1)}
                highlightId={highlightCommentId}
                currentUserId={currentUserId}
              />
            </ul>
          )}
        </div>
      )}

      {isLoading && comments.length === 0 ? (
        <p className="text-sm text-text-secondary">در حال بارگذاری نظرات...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-text-secondary">هنوز نظری ثبت نشده است.</p>
      ) : (
        <ul className={`flex flex-col gap-4 transition-opacity ${isLoading ? "opacity-50" : "opacity-100"}`}>
          {comments.map((comment) => (
            <CommentItem key={comment.id} manhwaSlug={manhwaSlug} comment={comment} currentUserId={currentUserId}/>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page === 1 || isLoading}
            onClick={() => goToPage(page - 1)}
            className="rounded-card border border-divider px-3 py-1.5 text-sm text-text-primary disabled:opacity-40"
          >
            قبلی
          </button>
          <span className="text-sm text-text-secondary">
            {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
          </span>
          <button
            type="button"
            disabled={page === totalPages || isLoading}
            onClick={() => goToPage(page + 1)}
            className="rounded-card border border-divider px-3 py-1.5 text-sm text-text-primary disabled:opacity-40"
          >
            بعدی
          </button>
        </div>
      )}
    </section>
  );
}