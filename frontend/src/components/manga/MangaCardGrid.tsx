interface MangaCardGridProps {
  children: React.ReactNode;
}

// گرید با تعداد ستون ثابت (نه auto-fill) — برای صفحاتی که کل نتایج باید دیده بشه
// (Browse، Weekly، Watchlist، Public Profile). تعداد ردیف آزاده، محدودیتی نداره؛
// فقط تعداد ستون در هر breakpoint ثابته تا ردیف آخر همیشه منظم پر بشه.
export function MangaCardGrid({ children }: MangaCardGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {children}
    </div>
  );
}
