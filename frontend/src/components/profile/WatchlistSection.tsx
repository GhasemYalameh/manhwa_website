"use client";

import { useEffect, useState } from "react";
import { MangaCard } from "@/components/manga/MangaCard";
import { useToast } from "@/components/ui/Toast";
import { MangaCardGrid } from "@/components/manga/MangaCardGrid";
import {
  getWatchList,
  updateWatchlistStatus,
  removeFromWatchlist,
  type WatchListApiItem,
  type WatchingStatus,
} from "@/lib/api/watchlist";
import { getCoverUrl } from "@/lib/api/manhwa";

const STATUS_LABELS: Record<WatchingStatus, string> = {
  wr: "بعدا میخونم",
  nr: "در حال خواندن",
  st: "متوقف شده",
  fn: "تمام کردم",
};

const STATUS_TABS: WatchingStatus[] = ["nr", "wr", "st", "fn"];

export function WatchlistSection() {
  const { showToast } = useToast();
  const [items, setItems] = useState<WatchListApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WatchingStatus>("nr");

  useEffect(() => {
    getWatchList()
      .then((res) => setItems(res.results))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleStatusChange(entryId: number, newStatus: WatchingStatus) {
    try {
      await updateWatchlistStatus(entryId, newStatus);
      setItems((prev) =>
        prev.map((item) => (item.id === entryId ? { ...item, watching_status: newStatus } : item))
      );
      showToast("وضعیت تغییر کرد.", "success");
    } catch {
      showToast("تغییر وضعیت با خطا مواجه شد.", "error");
    }
  }

  async function handleRemove(entryId: number) {
    try {
      await removeFromWatchlist(entryId);
      setItems((prev) => prev.filter((item) => item.id !== entryId));
      showToast("از لیست حذف شد.", "success");
    } catch {
      showToast("حذف با خطا مواجه شد.", "error");
    }
  }

  // watching_status ممکنه حروف بزرگ برگرده — دفاعی lowercase میکنیم (طبق تجربه‌ی ContinueReadingSection)
  const filtered = items.filter(
    (item) => (item.watching_status ?? "").toLowerCase() === activeTab
  );

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <h2 className="mb-4 text-lg font-bold text-text-primary">لیست مطالعه</h2>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              activeTab === tab
                ? "border-accent bg-accent text-white"
                : "border-divider bg-surface text-text-secondary hover:border-accent hover:text-accent"
            }`}
          >
            {STATUS_LABELS[tab]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-text-secondary">در حال بارگذاری...</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-text-secondary">موردی در این بخش وجود ندارد.</p>
      ) : (
        <MangaCardGrid>
          {filtered.map((item) => (
            <div key={item.id} className="flex flex-col gap-2">
              <MangaCard
                slug={item.manhwa.slug}
                coverUrl={getCoverUrl(item.manhwa.cover)}
                title={item.manhwa.fa_title || item.manhwa.en_title}
                rating={item.manhwa.avg_rating ? Number(item.manhwa.avg_rating) : undefined}
                chaptersCount={item.manhwa.chapters_count}
                viewsCount={item.manhwa.views_count}
                commentsCount={item.manhwa.comments_count}
                isHot={item.manhwa.is_hot}
                publicationStatus={item.manhwa.publication_status}
              />
              <div className="flex items-center gap-2">
                <select
                  value={item.watching_status ?? ""}
                  onChange={(e) => handleStatusChange(item.id, e.target.value as WatchingStatus)}
                  className="flex-1 rounded-card border border-divider bg-bg px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                >
                  {STATUS_TABS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="rounded-card border border-divider px-2 py-1.5 text-xs text-error hover:border-error"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </MangaCardGrid>
      )}
    </section>
  );
}
