import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "نارنج‌تون | مانهوای فارسی",
    template: "%s | نارنج‌تون",
  },
  description:
    "مطالعه‌ی آنلاین مانهوای فارسی با آخرین چپترها، پخش هفتگی و امکان دنبال‌کردن مانهواهای مورد علاقه‌ات.",
};

// جلوگیری از فلش تم اشتباه هنگام لود اولیه صفحه
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-vazir min-h-screen antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
