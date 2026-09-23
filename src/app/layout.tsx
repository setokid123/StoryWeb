import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Thư Các — Đọc một câu chuyện hay", template: "%s | Thư Các" },
  description: "Khám phá truyện hay và tận hưởng không gian đọc yên tĩnh tại Thư Các.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><SiteHeader /><main id="main-content">{children}</main><SiteFooter /></body></html>;
}
