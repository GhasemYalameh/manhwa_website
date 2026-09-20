"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_LINKS } from "@/lib/constants/nav";
import { getAccessToken, clearTokens } from "@/lib/api/client";
import { getMe, logout, type UserProfile } from "@/lib/api/auth";
import { getCoverUrl } from "@/lib/api/manhwa";
import { getUnreadNotificationsCount } from "@/lib/api/notifications";
import { SearchDropdown } from "@/components/layout/SearchDropdown";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ChevronDownIcon,
  MenuIcon,
  XIcon,
  UserCircleIcon,
  HeartIcon,
  LogOutIcon,
  CommentIcon,
  SearchIcon,
} from "@/components/icons";

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());
    setHasCheckedAuth(true);
    function handleStorage() {
      setIsLoggedIn(!!getAccessToken());
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setProfile(null);
      return;
    }
    getMe()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }
    getUnreadNotificationsCount()
      .then((res) => setUnreadCount(res.unread_count))
      .catch(() => setUnreadCount(0));
  }, [isLoggedIn]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  function toggleMobileMenu() {
    setMobileMenuOpen((v) => !v);
    setSearchOpen(false);
  }

  function toggleSearch() {
    setSearchOpen((v) => !v);
    setMobileMenuOpen(false);
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // توکن رفرش ممکنه از قبل نامعتبر باشه؛ لاگ‌اوت کلاینت در هر صورت انجام میشه
    }
    clearTokens();
    setIsLoggedIn(false);
    setUserMenuOpen(false);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-divider bg-surface">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 lg:h-20 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="text-xl font-bold text-accent lg:text-2xl">نارنج‌تون</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = isActiveLink(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b-2 pb-0 text-sm font-medium transition-colors ${active
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden max-w-xs flex-1 lg:block">
          <SearchDropdown variant="desktop" enableSlashShortcut />
        </div>

        {/* دسکتاپ */}
        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle variant="icon" />
          {hasCheckedAuth && isLoggedIn && (
            <NotificationDropdown unreadCount={unreadCount} onUnreadCountChange={setUnreadCount} />
          )}

          {!hasCheckedAuth ? (
            <div className="h-11 w-28 animate-pulse rounded-card bg-divider/50" />
          ) : isLoggedIn ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-accent-light"
              >
                <ChevronDownIcon className={`text-text-secondary transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                <span className="text-sm text-text-primary">{profile?.first_name ?? ""}</span>
                {profile?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getCoverUrl(profile.avatar)} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-light text-base font-semibold text-accent">
                    {profile?.first_name?.charAt(0) ?? "?"}
                  </span>
                )}
              </button>

              {userMenuOpen && (
                <div className="absolute start-0 top-full z-50 mt-2 w-52 rounded-card border border-divider bg-surface py-2 shadow-lg">
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:text-accent"
                  >
                    <UserCircleIcon />
                    پروفایل من
                  </Link>
                  <Link
                    href="/favorites"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:text-accent"
                  >
                    <HeartIcon />
                    علاقه‌مندی‌ها
                  </Link>
                  <Link
                    href="/tickets"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:text-accent"
                  >
                    <CommentIcon />
                    تیکت‌های من
                  </Link>
                  <div className="my-1 border-t border-divider" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-right text-sm text-error hover:bg-accent-light"
                  >
                    <LogOutIcon />
                    خروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-card bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
            >
              ورود
            </Link>
          )}
        </div>

        {/* موبایل: سرچ + اعلان + همبرگر */}
        <div className="flex items-center gap-1 lg:hidden">
          <button
            type="button"
            onClick={toggleSearch}
            aria-label="جستجو"
            className={`rounded-full p-2 transition-colors hover:bg-accent-light hover:text-accent ${searchOpen ? "text-accent" : "text-text-secondary"
              }`}
          >
            <SearchIcon />
          </button>

          {hasCheckedAuth && isLoggedIn && (
            <NotificationDropdown unreadCount={unreadCount} onUnreadCountChange={setUnreadCount} />
          )}

          <button
            type="button"
            onClick={toggleMobileMenu}
            aria-label="باز کردن منو"
            className="rounded-full p-2 text-text-primary"
          >
            {mobileMenuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ردیف سرچ موبایل */}
      {searchOpen && (
        <div className="border-t border-divider bg-surface px-4 py-3 lg:hidden">
          <SearchDropdown variant="mobile" />
        </div>
      )}

      {/* منوی همبرگری */}
      {mobileMenuOpen && (
        <div className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-divider bg-surface px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActiveLink(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-card px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-accent-light text-accent" : "text-text-secondary hover:bg-bg hover:text-text-primary"
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="my-3 border-t border-divider" />
          <ThemeToggle
            variant="menu"
            className="flex w-full items-center gap-2 rounded-card px-3 py-2.5 text-right text-sm text-text-secondary hover:bg-bg hover:text-text-primary"
          />
          {!hasCheckedAuth ? null : isLoggedIn ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-card px-3 py-2.5 text-sm text-text-secondary hover:bg-bg hover:text-text-primary"
              >
                <UserCircleIcon />
                {profile?.first_name ?? "پروفایل من"}
              </Link>
              <Link
                href="/favorites"
                className="flex items-center gap-2 rounded-card px-3 py-2.5 text-sm text-text-secondary hover:bg-bg hover:text-text-primary"
              >
                <HeartIcon />
                علاقه‌مندی‌ها
              </Link>
              <Link
                href="/tickets"
                className="flex items-center gap-2 rounded-card px-3 py-2.5 text-sm text-text-secondary hover:bg-bg hover:text-text-primary"
              >
                <CommentIcon />
                تیکت‌های من
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-card px-3 py-2.5 text-right text-sm text-error hover:bg-bg"
              >
                <LogOutIcon />
                خروج
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="block rounded-card bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-accent-dark"
            >
              ورود
            </Link>
          )}
        </div>
      )}
    </header>
  );
}