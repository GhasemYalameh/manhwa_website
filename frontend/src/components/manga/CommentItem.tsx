"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getCoverUrl } from "@/lib/api/manhwa";
import { getAccessToken } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { CommentForm } from "@/components/manga/CommentForm";

import {
  getCommentReplies,
  createComment,
  toggleCommentReaction,
  updateComment,
  deleteComment,
  type CommentApiItem,
  type CommentReaction,
} from "@/lib/api/comment";
import { ThumbsUpIcon, ThumbsDownIcon, ReplyIcon, EyeIcon } from "@/components/icons";

const MAX_REPLY_LEVEL = 2;

interface CommentItemProps {
  manhwaSlug: string;
  comment: CommentApiItem;
  replyChain?: CommentApiItem[];
  highlightId?: number;
  currentUserId?: string | null;
}

export function CommentItem({
  manhwaSlug,
  comment: initialComment,
  replyChain,
  highlightId,
  currentUserId,
}: CommentItemProps) {
  const { showToast } = useToast();
  const [comment, setComment] = useState(initialComment);
  const hasChainReply = !!replyChain && replyChain.length > 0;
  const [replies, setReplies] = useState<CommentApiItem[] | null>(hasChainReply ? [replyChain![0]] : null);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(hasChainReply);
  const [isReplying, setIsReplying] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = !!currentUserId && comment.author?.id === currentUserId;

  const isTarget = highlightId === comment.id;
  const itemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());
  }, []);

  useEffect(() => {
    if (isTarget && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isTarget]);

  async function fetchAllReplies() {
    setRepliesLoading(true);
    try {
      const repliesRes = await getCommentReplies(manhwaSlug, comment.id);
      setReplies(repliesRes);
    } catch {
      showToast("خطا در دریافت پاسخ‌ها.", "error");
    } finally {
      setRepliesLoading(false);
    }
  }

  async function handleToggleReplies() {
    if (repliesOpen) {
      setRepliesOpen(false);
      return;
    }
    setRepliesOpen(true);
    if (replies !== null) return;
    await fetchAllReplies();
  }

  async function handleReplySubmit(text: string, isSpoiler: boolean) {
    try {
      const created = await createComment(manhwaSlug, text, comment.id, isSpoiler);
      const newReply: CommentApiItem = {
        id: created.id,
        manhwa_slug: manhwaSlug,
        author: created.author,
        text: created.text,
        parent: created.parent,
        level: comment.level + 1,
        likes_count: 0,
        dis_likes_count: 0,
        replies_count: 0,
        user_reaction: null,
        is_spoiler: created.is_spoiler,
      };
      setReplies((prev) => (prev ? [...prev, newReply] : [newReply]));
      setComment((prev) => ({ ...prev, replies_count: prev.replies_count + 1 }));
      setRepliesOpen(true);
      setIsReplying(false);
      showToast("پاسخ شما ثبت شد.", "success");
    } catch {
      showToast("ثبت پاسخ با خطا مواجه شد.", "error");
    }
  }

  async function handleReaction(reaction: CommentReaction) {
    if (!isLoggedIn || isReacting) return;
    setIsReacting(true);
    try {
      const res = await toggleCommentReaction(manhwaSlug, comment.id, reaction);
      setComment((prev) => ({
        ...prev,
        likes_count: res.comment.likes_count,
        dis_likes_count: res.comment.dis_likes_count,
        user_reaction: res.action === "deleted" ? null : reaction,
      }));
    } catch {
      showToast("ثبت واکنش با خطا مواجه شد.", "error");
    } finally {
      setIsReacting(false);
    }
  }

  async function handleSaveEdit() {
    const trimmed = editText.trim();
    if (!trimmed || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await updateComment(manhwaSlug, comment.id, trimmed);
      setComment((prev) => ({ ...prev, text: trimmed }));
      setIsEditing(false);
      showToast("نظر شما ویرایش شد.", "success");
    } catch {
      showToast("ویرایش نظر با خطا مواجه شد.", "error");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;
    if (!window.confirm("آیا از حذف این نظر مطمئن هستید؟")) return;
    setIsDeleting(true);
    try {
      await deleteComment(manhwaSlug, comment.id);
      setIsDeleted(true);
      showToast("نظر شما حذف شد.", "success");
    } catch {
      showToast("حذف نظر با خطا مواجه شد.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  const showLoadMoreReplies = hasChainReply && replies !== null && replies.length < comment.replies_count;
  const isBlurred = comment.is_spoiler && !isSpoilerRevealed && !isDeleted;

  return (
    <li
      ref={itemRef}
      className={`rounded-card bg-surface p-4 transition-shadow ${isTarget ? "ring-2 ring-accent" : ""}`}
    >
      <div className="flex items-center gap-2">
        {comment.author ? (
          <Link href={`/users/${comment.author.id}`} className="flex items-center gap-2 hover:opacity-80">
            {comment.author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getCoverUrl(comment.author.avatar)}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-light text-sm font-semibold text-accent">
                {comment.author.first_name?.charAt(0) ?? "?"}
              </span>
            )}
            <span className="text-sm font-medium text-text-primary">{comment.author.first_name}</span>
          </Link>
        ) : (
          <>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-light text-sm font-semibold text-accent">
              ?
            </span>
            <span className="text-sm font-medium text-text-primary">کاربر حذف‌شده</span>
          </>
        )}
        {comment.author?.is_subscriber && (
          <span className="rounded-full bg-accent-light px-2 py-0.5 text-[11px] font-semibold text-accent">
            مشترک
          </span>
        )}
        {comment.is_spoiler && !isDeleted && (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
            اسپویل
          </span>
        )}
      </div>

      <div className="relative mt-4">
        {isDeleted ? (
          <p dir="auto" className="text-sm italic text-text-secondary">
            این نظر توسط نویسنده حذف شد.
          </p>
        ) : isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              dir="auto"
              className="w-full resize-none rounded-card border border-divider bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditText(comment.text);
                }}
                className="rounded-card border border-divider px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editText.trim() || isSavingEdit}
                className="rounded-card bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                {isSavingEdit ? "در حال ذخیره..." : "ذخیره"}
              </button>
            </div>
          </div>
        ) : (
          <p
            dir="auto"
            className={`text-sm text-text-primary transition-all duration-300 ${isBlurred ? "select-none blur-sm" : ""
              }`}
          >
            {comment.text}
          </p>
        )}
        {isBlurred && (
          <button
            type="button"
            onClick={() => setIsSpoilerRevealed(true)}
            className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-card bg-surface/70 text-lg font-medium text-text-secondary backdrop-blur-[1px] transition-colors hover:text-accent"
          >
            <EyeIcon className="h-8 w-8" />
            این نظر اسپویل دارد — برای نمایش کلیک کنید
          </button>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
        {!isDeleted && !isEditing && (
          <>
            <button
              type="button"
              disabled={!isLoggedIn || isReacting}
              onClick={() => handleReaction("lk")}
              className={`flex items-center gap-1 transition-colors hover:text-accent disabled:cursor-not-allowed disabled:hover:text-text-secondary ${comment.user_reaction === "lk" ? "font-semibold text-accent" : ""
                }`}
            >
              <ThumbsUpIcon className={comment.user_reaction === "lk" ? "fill-accent/20" : ""} />
              {comment.likes_count.toLocaleString("fa-IR")}
            </button>
            <button
              type="button"
              disabled={!isLoggedIn || isReacting}
              onClick={() => handleReaction("dlk")}
              className={`flex items-center gap-1 transition-colors hover:text-error disabled:cursor-not-allowed disabled:hover:text-text-secondary ${comment.user_reaction === "dlk" ? "font-semibold text-error" : ""
                }`}
            >
              <ThumbsDownIcon className={comment.user_reaction === "dlk" ? "fill-error/20" : ""} />
              {comment.dis_likes_count.toLocaleString("fa-IR")}
            </button>

            {isLoggedIn && comment.level < MAX_REPLY_LEVEL && (
              <button
                type="button"
                onClick={() => setIsReplying((v) => !v)}
                className="flex items-center gap-1 hover:text-accent"
              >
                <ReplyIcon />
                پاسخ
              </button>
            )}

            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setEditText(comment.text);
                  }}
                  className="hover:text-accent"
                >
                  ویرایش
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="hover:text-error disabled:opacity-50"
                >
                  {isDeleting ? "در حال حذف..." : "حذف"}
                </button>
              </>
            )}
          </>
        )}

        {comment.replies_count > 0 && (
          <button type="button" onClick={handleToggleReplies} className="hover:text-accent">
            {repliesOpen ? "بستن پاسخ‌ها" : `نمایش ${comment.replies_count.toLocaleString("fa-IR")} پاسخ`}
          </button>
        )}
      </div>

      {!isDeleted && isReplying && (
        <div className="mt-3 border-r-2 border-divider pr-3">
          <CommentForm
            placeholder="پاسخ خود را بنویسید..."
            submitLabel="ارسال پاسخ"
            autoFocus
            onSubmit={handleReplySubmit}
            onCancel={() => setIsReplying(false)}
          />
        </div>
      )}

      {repliesOpen && (
        <div className="mt-3 flex flex-col gap-3 border-r-2 border-divider pr-3">
          {repliesLoading ? (
            <p className="text-xs text-text-secondary">در حال بارگذاری پاسخ‌ها...</p>
          ) : (
            <>
              {replies?.map((reply) => (
                <CommentItem
                  key={reply.id}
                  manhwaSlug={manhwaSlug}
                  comment={reply}
                  highlightId={highlightId}
                  currentUserId={currentUserId}
                  replyChain={
                    hasChainReply && replyChain![0].id === reply.id ? replyChain!.slice(1) : undefined
                  }
                />
              ))}
              {showLoadMoreReplies && (
                <button
                  type="button"
                  onClick={fetchAllReplies}
                  className="self-start text-xs text-accent hover:underline"
                >
                  نمایش همه‌ی پاسخ‌ها
                </button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}