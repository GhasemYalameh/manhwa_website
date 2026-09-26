"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeSignup, getAccessToken } from "@/lib/api/auth";
import { isValidEmail, isValidFirstName, isValidLastName } from "@/lib/validators/profile";
import { ApiError } from "@/lib/api/client";
import { MailIcon, UserCircleIcon } from "@/components/icons";

function extractMessage(body: unknown): string | undefined {
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    const val = rec.detail ?? rec.message ?? rec.error;
    if (typeof val === "string") return val;
  }
  return undefined;
}

export default function CompletionPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const canSubmit =
    isValidFirstName(firstName) &&
    isValidLastName(lastName) &&
    isValidEmail(email) &&
    !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    // اگر توکن نباشه یعنی کاربر مستقیم به این صفحه اومده، نه از فلوی verify
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    setError(undefined);
    setLoading(true);

    try {
      await completeSignup({
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        email: email.trim() || undefined,
      });
      router.push("/profile");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // توکن منقضی یا نامعتبره؛ کاربر باید دوباره وارد بشه
        router.push("/login");
        return;
      }
      if (err instanceof ApiError) {
        setError(extractMessage(err.body) ?? "اطلاعات وارد شده معتبر نیست.");
      } else {
        setError("خطا در برقراری ارتباط با سرور. دوباره تلاش کنید.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-medium text-text-primary text-center">تکمیل ثبت‌نام</h1>
      <p className="mb-6 text-sm text-text-secondary text-center">
        برای تکمیل حساب کاربری، لطفاً اطلاعات زیر را وارد کنید.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <UserCircleIcon />
          </span>
          <input
            id="firstName"
            type="text"
            maxLength={25}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={loading}
            className="w-full rounded-card border border-divider bg-surface py-3 pr-11 pl-4 text-right text-lg text-text-primary outline-none transition-colors placeholder:text-text-secondary/60 placeholder:text-right focus:border-accent disabled:opacity-50"
            placeholder="نام"
          />
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <UserCircleIcon />
          </span>
          <input
            id="lastName"
            type="text"
            maxLength={25}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={loading}
            className="w-full rounded-card border border-divider bg-surface py-3 pr-11 pl-4 text-right text-lg text-text-primary outline-none transition-colors placeholder:text-text-secondary/60 placeholder:text-right focus:border-accent disabled:opacity-50"
            placeholder="نام خانوادگی (اختیاری)"
          />
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <MailIcon />
          </span>
          <input
            id="email"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full rounded-card border border-divider bg-surface py-3 pr-11 pl-4 text-right text-lg text-text-primary outline-none transition-colors placeholder:text-text-secondary/60 placeholder:text-right focus:border-accent disabled:opacity-50"
            placeholder="ایمیل (اختیاری)"
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-card bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "در حال ثبت..." : "تکمیل ثبت‌نام"}
        </button>
      </form>
    </>
  );
}