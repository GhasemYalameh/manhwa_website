"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OtpInput } from "@/components/auth/OtpInput";
import { CountdownTimer } from "@/components/auth/CountdownTimer";
import { generateOtp, storeTokens, verifyOtp } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { formatPhoneDisplay } from "@/lib/validators/phone";

const OTP_TTL_SECONDS = 120;

function extractMessage(body: unknown): string | undefined {
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    const val = rec.detail ?? rec.message ?? rec.error;
    if (typeof val === "string") return val;
  }
  return undefined;
}

function VerifyForm() {
  const router = useRouter();
  const phone = useSearchParams().get("phone") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string>();
  const [blacklisted, setBlacklisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [resending, setResending] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 5 || loading || blacklisted) return;

    setError(undefined);
    setLoading(true);

    try {
      const res = await verifyOtp(phone, otp);
      storeTokens(res.access_token, res.refresh_token);
      router.push(res.is_new_user ? "/completion" : "/profile");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setBlacklisted(true);
        } else {
          setError(extractMessage(err.body) ?? "کد وارد شده صحیح نیست.");
          setOtp("");
        }
      } else {
        setError("خطا در برقراری ارتباط با سرور. دوباره تلاش کنید.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(undefined);
    try {
      await generateOtp(phone);
      setOtp("");
      setExpired(false);
      setTimerKey((k) => k + 1);
    } catch {
      setError("ارسال مجدد کد ناموفق بود. کمی بعد دوباره تلاش کنید.");
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-medium text-text-primary text-center">تایید کد</h1>
      <p className="mb-6 text-sm text-text-secondary text-center">
        کد ۵ رقمی ارسال‌شده به شماره{" "}
        <span dir="ltr" className="text-text-primary ">{formatPhoneDisplay(phone)}</span> را وارد کنید.{" "}
        <Link href="/login" className="text-accent hover:text-accent-dark">
          تغییر شماره
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <OtpInput value={otp} onChange={setOtp} error={error} disabled={loading || blacklisted} />

        {blacklisted && (
          <p className="rounded-card bg-accent-light px-4 py-3 text-center text-sm text-error">
            به دلیل تلاش‌های ناموفق زیاد، دسترسی شما موقتاً محدود شده است.
          </p>
        )}
        {expired && !blacklisted && (
          <p className="rounded-card bg-accent-light px-4 py-3 text-center text-sm text-error">
            کد تایید منقضی شده است. لطفاً کد جدید دریافت کنید.
          </p>
        )}

        <button
          type="submit"
          disabled={otp.length !== 5 || loading || blacklisted || expired}
          className="w-full rounded-card bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "در حال بررسی..." : "تایید"}
        </button>

        <div className="flex items-center justify-center gap-1 text-sm text-text-secondary">
          {!expired && <span>کد را دریافت نکردید؟</span>}
          {!expired ? (
            <span>
              ارسال مجدد (
              <CountdownTimer
                seconds={OTP_TTL_SECONDS}
                resetKey={timerKey}
                onExpire={() => setExpired(true)}
              />
              )
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || blacklisted}
              className="text-accent hover:text-accent-dark disabled:opacity-40"
            >
              {resending ? "در حال ارسال..." : "ارسال مجدد"}
            </button>
          )}
        </div>
      </form>
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
