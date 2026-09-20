"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import {
  getTicket,
  getTicketMessages,
  sendTicketMessage,
  updateTicket,
  isTicketUserObject,
  type TicketApiItem,
  type TicketMessage,
} from "@/lib/api/tickets";

interface TicketThreadProps {
  ticketId: number;
  isAdmin: boolean;
}


const PAGE_SIZE = 10;
const SCROLL_TOP_THRESHOLD = 60;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("fa-IR");
}

export function TicketThread({ ticketId, isAdmin }: TicketThreadProps) {
  const { showToast } = useToast();
  const [ticket, setTicket] = useState<TicketApiItem | null>(null);
  // همیشه قدیمی‌ترین بالا، جدیدترین پایین (خلاف ترتیبی که بک‌اند برمیگردونه)
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [nextPageToLoad, setNextPageToLoad] = useState(2); // صفحه‌ی ۱ همون اول لود میشه
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledInitially = useRef(false);
  const hasMarkedSeen = useRef(false);
  const [isClosing, setIsClosing] = useState(false);

  // بارگذاری اولیه — صفحه‌ی ۱ (جدیدترین پیام‌ها)، معکوس میشه تا قدیمی‌ترینِ همون صفحه بالا بیفته
  useEffect(() => {
    let cancelled = false;
    Promise.all([getTicket(ticketId), getTicketMessages(ticketId, 1)])
      .then(([ticketRes, messagesRes]) => {
        if (cancelled) return;
        setTicket(ticketRes);
        // ادمین که تیکت رو باز می‌کنه، خودکار علامت دیده‌شده می‌خوره
        if (isAdmin && !ticketRes.is_seen && !hasMarkedSeen.current) {
          hasMarkedSeen.current = true;
          updateTicket(ticketId, { is_seen: true }).catch(() => { });
        }
        setMessages([...messagesRes.results].reverse());
        setTotalPages(Math.max(1, Math.ceil(messagesRes.count / PAGE_SIZE)));
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  // اسکرول به انتها فقط یک‌بار، بعد از اولین لود
  useEffect(() => {
    if (!isLoading && !hasScrolledInitially.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      hasScrolledInitially.current = true;
    }
  }, [isLoading]);

  async function handleScroll() {
    const container = containerRef.current;
    if (!container || isLoadingMore || nextPageToLoad > totalPages) return;
    if (container.scrollTop > SCROLL_TOP_THRESHOLD) return;

    setIsLoadingMore(true);
    const prevScrollHeight = container.scrollHeight;
    try {
      const res = await getTicketMessages(ticketId, nextPageToLoad);
      // این صفحه هم جدید→قدیم برمیگرده؛ معکوس میکنیم و بالای لیست فعلی میذاریم
      setMessages((prev) => [...[...res.results].reverse(), ...prev]);
      setNextPageToLoad((p) => p + 1);
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight - prevScrollHeight;
        }
      });
    } catch {
      showToast("خطا در دریافت پیام‌های قدیمی‌تر.", "error");
    } finally {
      setIsLoadingMore(false);
    }
  }

  function toggleTimestamp(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function handleToggleStatus() {
    if (!ticket || isClosing) return;
    const nextStatus = ticket.status === "op" ? "cl" : "op";
    setIsClosing(true);
    try {
      const updated = await updateTicket(ticketId, { status: nextStatus });
      setTicket(updated);
      showToast(nextStatus === "cl" ? "تیکت بسته شد." : "تیکت دوباره باز شد.", "success");
    } catch {
      showToast("تغییر وضعیت تیکت با خطا مواجه شد.", "error");
    } finally {
      setIsClosing(false);
    }
  }
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending || !ticket) return;
    setIsSending(true);
    try {
      const created = await sendTicketMessage(ticketId, trimmed);
      const newMessage: TicketMessage = {
        id: created.id,
        user: ticket.user,
        text: created.text,
        message_sender: created.message_sender,
        created_at: created.created_at,
        modified_at: created.created_at,
      };
      setMessages((prev) => [...prev, newMessage]);
      setText("");
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      });
    } catch {
      showToast("ارسال پیام با خطا مواجه شد.", "error");
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading && !ticket) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-text-secondary">در حال بارگذاری...</p>
      </main>
    );
  }

  if (notFound || !ticket) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
        <p className="text-text-primary">این تیکت پیدا نشد.</p>
        <Link
          href="/tickets"
          className="rounded-card border border-divider px-5 py-2.5 text-sm text-text-primary hover:border-accent hover:text-accent"
        >
          بازگشت به تیکت‌ها
        </Link>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] flex-col bg-bg lg:h-[calc(100dvh-5rem)]">
      <div className="shrink-0 border-b border-divider bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-[900px] items-center justify-between">
          <Link href="/tickets" className="text-sm text-text-secondary hover:text-accent">
            بازگشت
          </Link>
          <h1 dir="auto" className="truncate text-sm font-semibold text-text-primary">
            {ticket.title}
          </h1>
          {isAdmin ? (
            <div className="flex shrink-0 items-center gap-2">
              {isTicketUserObject(ticket.user) && (
                <Link
                  href={`/users/${ticket.user.id}`}
                  className="rounded-card border border-divider px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent"
                >
                  مشاهده پروفایل
                </Link>
              )}
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isClosing}
                className={`rounded-card border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${ticket.status === "cl"
                  ? "border-success text-success hover:bg-success/10"
                  : "border-error text-error hover:bg-error/10"
                  }`}
              >
                {ticket.status === "cl" ? "بازگشایی" : "بستن تیکت"}
              </button>
            </div>
          ) : (
            ticket.status === "cl" && (
              <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
                بسته‌شده
              </span>
            )
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="mx-auto flex max-w-[900px] flex-col gap-3">
          {isLoadingMore && (
            <p className="pb-2 text-center text-xs text-text-secondary">در حال دریافت پیام‌های قدیمی‌تر...</p>
          )}

          {messages.map((message) => {
            const isOwnMessage =
              (isAdmin && message.message_sender === "admin") ||
              (!isAdmin && message.message_sender === "user");
            const isLast = message.id === messages[messages.length - 1]?.id;
            const showTimestamp = isLast || expandedIds.has(message.id);

            return (
              <div key={message.id} className={`flex flex-col ${isOwnMessage ? "items-start" : "items-end"}`}>
                <button
                  type="button"
                  onClick={() => toggleTimestamp(message.id)}
                  className={`max-w-[80%] rounded-card px-4 py-2.5 text-sm text-start transition-colors ${isOwnMessage ? "bg-accent-light text-text-primary" : "bg-surface text-text-primary"
                    }`}
                  dir="auto"
                >
                  <p className="mb-1 text-xs font-semibold text-text-secondary">
                    {message.message_sender === "admin" ? "پشتیبانی" : "کاربر"}
                  </p>
                  <p>{message.text}</p>
                </button>
                {showTimestamp && (
                  <span className="mt-1 px-1 text-[11px] text-text-secondary">
                    {formatTime(message.created_at)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {ticket.status === "cl" ? (
        <div className="shrink-0 border-t border-divider bg-surface px-4 py-3 text-center text-sm text-text-secondary">
          این تیکت بسته شده است.
        </div>
      ) : (
        <form onSubmit={handleSend} className="shrink-0 border-t border-divider bg-surface px-4 py-3">
          <div className="mx-auto flex max-w-[900px] items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="پیام خود را بنویسید..."
              dir="auto"
              className="flex-1 rounded-card border border-divider bg-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!text.trim() || isSending}
              className="rounded-card bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {isSending ? "..." : "ارسال"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}