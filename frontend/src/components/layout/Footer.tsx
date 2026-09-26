import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants/nav";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-divider bg-surface">
      <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <span className="text-xl font-bold text-accent">نارنج‌تون</span>
            <p className="mt-3 max-w-xs text-sm leading-6 text-text-secondary">
              پلتفرم خواندن مانهوا به زبان فارسی — تازه‌ترین قسمت‌ها، هر هفته.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-text-primary">صفحات</h3>
            <ul className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-text-primary">حساب کاربری</h3>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/profile" className="text-sm text-text-secondary transition-colors hover:text-accent">
                  پروفایل من
                </Link>
              </li>
              <li>
                <Link href="/tickets" className="text-sm text-text-secondary transition-colors hover:text-accent">
                  تیکت‌های پشتیبانی
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-divider pt-6 text-xs text-text-secondary sm:flex-row sm:justify-between">
          <span>© {currentYear.toLocaleString("fa-IR")} نارنج‌تون. تمامی حقوق محفوظ است.</span>
          <span>ساخته‌شده برای علاقه‌مندان مانهوا</span>
        </div>
      </div>
    </footer>
  );
}
