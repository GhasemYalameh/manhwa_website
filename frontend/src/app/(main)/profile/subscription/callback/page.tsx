"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { verifySubscriptionPayment } from "@/lib/api/subscription";

type ResultState =
  | "checking"
  | "success"
  | "failed"
  | "not_found"
  | "already_used"
  | "error";

function getMessage(state: ResultState): string {
  switch (state) {
    case "success":
      return "پرداخت با موفقیت انجام شد و اشتراک شما فعال شد.";
    case "failed":
      return "پرداخت ناموفق بود یا توسط شما لغو شد.";
    case "not_found":
      return "سفارش مربوط به این پرداخت پیدا نشد.";
    case "already_used":
      return "این پرداخت قبلاً برای فعال‌سازی اشتراک استفاده شده است.";
    default:
      return "در تایید پرداخت خطایی رخ داد. در صورت کسر وجه با پشتیبانی تماس بگیرید.";
  }
}

function SubscriptionCallbackContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ResultState>("checking");

  useEffect(() => {
    const authority = searchParams.get("Authority");
    const status = searchParams.get("Status");

    if (!authority || !status) {
      setState("error");
      return;
    }

    verifySubscriptionPayment(authority, status)
      .then(() => setState("success"))
      .catch((err) => {
        if (err instanceof ApiError) {
          if (err.status === 412) return setState("failed");
          if (err.status === 404) return setState("not_found");
          if (err.status === 226) return setState("already_used");
        }

        setState("error");
      });
  }, [searchParams]);

  const isChecking = state === "checking";
  const isSuccess = state === "success";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      {isChecking ? (
        <p className="text-sm text-text-secondary">
          در حال بررسی نتیجه‌ی پرداخت...
        </p>
      ) : (
        <>
          <p
            className={`text-base font-semibold ${isSuccess ? "text-success" : "text-error"
              }`}
          >
            {getMessage(state)}
          </p>

          <Link
            href="/profile"
            className="rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            بازگشت به پروفایل
          </Link>
        </>
      )}
    </main>
  );
}

export default function SubscriptionCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-center">
          <p className="text-sm text-text-secondary">
            در حال بررسی نتیجه‌ی پرداخت...
          </p>
        </main>
      }
    >
      <SubscriptionCallbackContent />
    </Suspense>
  );
}
