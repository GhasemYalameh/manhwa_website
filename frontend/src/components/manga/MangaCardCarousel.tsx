"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface MangaCardCarouselProps {
  children: React.ReactNode;
}

// یک ردیف افقی با اسکرول دستی (کلیک و کشیدن با موس، یا لمس روی موبایل/تبلت).
// عرض هر آیتم دقیقاً هماهنگ با تعداد ستون MangaCardGrid است (۲ موبایل / ۳ تبلت / ۵ دسکتاپ)
// تا بریدگی کارت آخر پیش نیاد. نشانگر «قابل اسکرول بودن» یک گرادینت محو در لبه‌هاست،
// نه اسکرول‌بار یا فلش — که به‌صورت پویا بر اساس موقعیت فعلی اسکرول نمایش/مخفی میشه.
export function MangaCardCarousel({ children }: MangaCardCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [showStartFade, setShowStartFade] = useState(false);
  const [showEndFade, setShowEndFade] = useState(false);

  const updateFadeVisibility = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    // مقدار scrollLeft در RTL بسته به مرورگر ممکنه منفی یا مثبت باشه؛ با قدرمطلق نرمالایز میشه
    const currentScroll = Math.abs(el.scrollLeft);
    setShowEndFade(currentScroll < maxScroll - 2);
    setShowStartFade(currentScroll > 2);
  }, []);

  useEffect(() => {
    updateFadeVisibility();
    const el = containerRef.current;
    if (!el) return;
    const handleResize = () => updateFadeVisibility();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateFadeVisibility, children]);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartXRef.current = e.pageX;
    dragStartScrollLeftRef.current = el.scrollLeft;
    setIsDragging(true);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDraggingRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const delta = e.pageX - dragStartXRef.current;
    if (Math.abs(delta) > 3) hasDraggedRef.current = true;
    el.scrollLeft = dragStartScrollLeftRef.current - delta;
  }

  function endDrag() {
    isDraggingRef.current = false;
    setIsDragging(false);
  }

  // بعد از درگ واقعی، جلوی کلیک روی لینک زیرش گرفته میشه تا کارت باز نشه
  function handleClickCapture(e: React.MouseEvent) {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onScroll={updateFadeVisibility}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClickCapture={handleClickCapture}
        className={`scrollbar-hide flex gap-4 overflow-x-auto ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          } [&>*]:w-[calc((100%-1rem)/2)] [&>*]:shrink-0 sm:[&>*]:w-[calc((100%-2rem)/3)] lg:[&>*]:w-[calc((100%-4rem)/5)]`}
      >
        {children}
      </div>

      {/* گرادینت محو — سمت راست یعنی «می‌تونی به عقب برگردی» (چون RTL) */}
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg to-transparent transition-opacity duration-200 ${showStartFade ? "opacity-100" : "opacity-0"
          }`}
      />
      {/* سمت چپ یعنی «محتوای بیشتری برای دیدن هست» */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-bg to-transparent transition-opacity duration-200 ${showEndFade ? "opacity-100" : "opacity-0"
          }`}
      />
    </div>
  );
}
