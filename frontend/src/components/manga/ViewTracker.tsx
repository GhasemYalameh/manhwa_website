"use client";

import { useEffect, useRef } from "react";
import { getAccessToken } from "@/lib/api/client";
import { trackView } from "@/lib/api/manhwa";

interface ViewTrackerProps {
  slug: string;
}

// کامپوننتی بدون UI — فقط یک درخواست ویو رو، اگه کاربر لاگین باشه، یک‌بار برای هر slug می‌زنه.
export function ViewTracker({ slug }: ViewTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    if (!getAccessToken()) return; // کاربر مهمان — اصلاً درخواست نره
    hasTracked.current = true;
    trackView(slug).catch(() => {
      // best-effort — شکست خوردنش نباید تجربه‌ی کاربر رو مختل کنه (نه toast، نه چیزی)
    });
  }, [slug]);

  return null;
}
