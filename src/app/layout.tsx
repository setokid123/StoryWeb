import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["vietnamese"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "600", "700", "800"],
});

const lora = Lora({
  subsets: ["vietnamese"],
  display: "swap",
  variable: "--font-lora",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Thư Các — Đọc một câu chuyện hay", template: "%s | Thư Các" },
  description: "Khám phá truyện hay và tận hưởng không gian đọc yên tĩnh tại Thư Các.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${inter.variable} ${lora.variable}`}>
      <body>
        <ThemeProvider>
          <SiteHeader />
          <main id="main-content">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
