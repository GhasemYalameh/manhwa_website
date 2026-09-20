"use client";

import Link from "next/link";
import { timeAgo } from "@/lib/utils/time";
import { useEffect, useRef, useState } from "react";
import {
  getNotifications,
  markNotificationRead,
  type NotificationApiItem,
} from "@/lib/api/notifications";
import { BellIcon } from "@/components/icons";

interface NotificationDropdownProps {
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
}

const NOTIF_LEVEL_COLOR: Record<string, string> = {
  suc: "bg-success",
  inf: "bg-accent",
  war: "bg-warning",
  fal: "bg-error",
};

function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function getNotificationHref(notif: NotificationApiItem): string | null {
  if (notif.target_content_type === "chapter" && notif.target_object && "images" in notif.target_object) {
    return `/manhwa/${notif.target_object.manhwa_slug}/chapter/${notif.target_object.id}`;
  }
  if (notif.target_content_type === "comment" && notif.target_object && "text" in notif.target_object) {
    return `/manhwa/${notif.target_object.manhwa_slug}?highlightComment=${notif.target_object.id}`;
  }
  return null;
}

function getNotificationText(notif: NotificationApiItem): string {
  if (notif.target_content_type === "chapter" && notif.target_object && "number" in notif.target_object) {
    return `قسمت ${notif.target_object.number.toLocaleString("fa-IR")} منتشر شد`;
  }
  if (notif.target_content_type === "comment" && notif.target_object && "text" in notif.target_object) {
    const senderName = notif.sender?.first_name ?? "کاربری";
    const action = notif.notif_type === "rpc" ? "به نظر شما پاسخ داد" : "به نظر شما واکنش نشان داد";
    return `${senderName} ${action}: «${truncate(notif.target_object.text)}»`;
  }
  return "اطلاعیه سیستم";
}

export function NotificationDropdown({ unreadCount, onUnreadCountChange }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleToggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !hasLoaded) {
      setIsLoading(true);
      getNotifications()
        .then((res) => setItems(res.results))
        .catch(() => setItems([]))
        .finally(() => {
          setIsLoading(false);
          setHasLoaded(true);
        });
    }
  }

  async function handleItemClick(notif: NotificationApiItem) {
    if (!notif.is_read) {
      setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
      onUnreadCountChange(Math.max(0, unreadCount - 1));
      try {
        await markNotificationRead(notif.id);
      } catch {
        setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: false } : n)));
        onUnreadCountChange(unreadCount);
      }
    }
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="اعلان‌ها"
        className="relative rounded-full p-2 text-text-secondary transition-colors hover:bg-accent-light hover:text-accent"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />
        )}
      </button>

      {isOpen && (
          <div className="fixed inset-x-2 top-[3.75rem] z-50 max-h-[70vh] overflow-y-auto rounded-card border border-divider bg-surface py-2 shadow-lg lg:absolute lg:inset-x-auto lg:start-0 lg:top-full lg:mt-2 lg:max-h-96 lg:w-80">          {isLoading ? (
            <p className="px-4 py-3 text-sm text-text-secondary">در حال بارگذاری...</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-secondary">اعلانی وجود ندارد.</p>
          ) : (
            items.map((notif) => {
              const href = getNotificationHref(notif);
              const text = getNotificationText(notif);
              const content = (
                <div
                  className={`flex items-start gap-2 px-4 py-2.5 transition-colors hover:bg-accent-light ${!notif.is_read ? "bg-accent-light/40" : ""
                    }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${NOTIF_LEVEL_COLOR[notif.notif_level] ?? "bg-text-secondary"
                      }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p dir="auto" className="text-sm text-text-primary">
                      {text}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                </div>
              );

              return href ? (
                <Link key={notif.id} href={href} onClick={() => handleItemClick(notif)}>
                  {content}
                </Link>
              ) : (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleItemClick(notif)}
                  className="block w-full text-right"
                >
                  {content}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}