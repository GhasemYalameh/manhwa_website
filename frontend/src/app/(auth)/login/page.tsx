"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { generateOtp, loginWithPassword, storeTokens } from "@/lib/api/auth";
import { isValidPhone } from "@/lib/validators/phone";
import { ApiError } from "@/lib/api/client";

type Tab = "otp" | "password";

function extractMessage(body: unknown): string | undefined {
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    const val = rec.detail ?? rec.message ?? rec.error;
    if (typeof val === "string") return val;
  }
  return undefined;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab: Tab = searchParams.get("tab") === "password" ? "password" : "otp";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [blacklisted, setBlacklisted] = useState(false);
  const [loading, setLoading] = useState(false);

  function switchTab(next: Tab) {
    setTab(next);
    setError(undefined);
    setBlacklisted(false);
  }

  const canSubmit =
    tab === "otp"
      ? isValidPhone(phone) && !loading
      : isValidPhone(phone) && password.length > 0 && !loading;

  async function handleOtpSubmit() {
    try {
      await generateOtp(phone);
      router.push(`/verify?phone=${phone}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setBlacklisted(true);
        } else if (err.status === 406) {
          // کد قبلا ارسال شده و هنوز منقضی نشده؛ کاربر را مستقیم به صفحه تایید می‌بریم
          router.push(`/verify?phone=${phone}`);
          return;
        } else {
          setError("شماره موبایل معتبر نیست.");
        }
      } else {
        setError("خطا در برقراری ارتباط با سرور. دوباره تلاش کنید.");
      }
    }
  }

  async function handlePasswordSubmit() {
    try {
      const res = await loginWithPassword(phone, password);
      storeTokens(res.access_token, res.refresh_token);
      router.push("/profile");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(extractMessage(err.body) ?? "شماره موبایل یا رمز عبور اشتباه است.");
      } else {
        setError("خطا در برقراری ارتباط با سرور. دوباره تلاش کنید.");
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(undefined);
    setBlacklisted(false);
    setLoading(true);

    if (tab === "otp") {
      await handleOtpSubmit();
    } else {
      await handlePasswordSubmit();
    }

    setLoading(false);
  }

  return (
    <>
      <h1 className="mb-2 text-3xl font-medium text-text-primary text-center">احراز هویت</h1>
      <p className="mb-2 text-sm text-text-secondary text-center">
        {tab === "otp"
          ? "ورود یا ثبت نام با کد پیامکی"
          : "ورود با رمز عبور"}
      </p>
      <div className="mb-10 flex rounded-card border border-divider p-1">
        <button
          type="button"
          onClick={() => switchTab("otp")}
          className={`flex-1 rounded-[8px] py-2 text-sm font-medium transition-colors ${tab === "otp" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
        >
          کد پیامکی
        </button>
        <button
          type="button"
          onClick={() => switchTab("password")}
          className={`flex-1 rounded-[8px] py-2 text-sm font-medium transition-colors ${tab === "password" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
        >
          رمز عبور
        </button>
      </div>



      <form onSubmit={handleSubmit} className="space-y-5">
        <PhoneInput value={phone} onChange={setPhone} disabled={loading} autoFocus />

        {tab === "password" && (
          <PasswordInput
            id="password"
            label="رمز عبور"
            value={password}
            placeholder="رمز عبور"
            onChange={setPassword}
            disabled={loading}
            autoComplete="current-password"
          />
        )}

        {blacklisted && (
          <p className="rounded-card bg-accent-light px-4 py-3 text-sm text-error">
            به دلیل تلاش‌های ناموفق زیاد، دسترسی شما موقتاً محدود شده است. کمی بعد دوباره تلاش
            کنید.
          </p>
        )}

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-card bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading
            ? tab === "otp"
              ? "در حال ارسال..."
              : "در حال ورود..."
            : tab === "otp"
              ? "دریافت کد تایید"
              : "ورود"}
        </button>
      </form>

      {tab === "password" && (
        <p className="mt-6 text-center text-sm text-text-secondary">
          اکانت ندارید؟{" "}
          <Link href="/signup" className="text-accent hover:text-accent-dark">
            ثبت‌نام
          </Link>
        </p>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}