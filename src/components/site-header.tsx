"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Menu, Search, X, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { resolved, setTheme } = useTheme();

  const isDark = resolved === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const links = [
    { href: "/", label: "Trang chủ" },
    { href: "/tim-kiem", label: "Khám phá" },
    { href: "/tu-truyen", label: "Tủ truyện" },
    { href: "/panel", label: "Đăng truyện" },
  ];

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" href="/" aria-label="Thư Các - Trang chủ" onClick={() => setMenuOpen(false)}>
          <span className="brand__mark"><BookOpen size={24} strokeWidth={1.6} /></span>
          <span>THƯ <em>CÁC</em></span>
        </Link>
        <nav className={`main-nav ${menuOpen ? "main-nav--open" : ""}`} aria-label="Điều hướng chính">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? "is-active" : ""} onClick={() => setMenuOpen(false)}>{link.label}</Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <button className="icon-button" type="button" aria-label={isDark ? "Chế độ sáng" : "Chế độ tối"} onClick={toggleTheme}>{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
          <Link className="icon-button header-search" href="/tim-kiem" aria-label="Tìm kiếm truyện"><Search size={20} /></Link>
          <Link className="header-cta" href="/tim-kiem">Bắt đầu đọc <span>↗</span></Link>
          <button className="icon-button menu-toggle" type="button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
    </header>
  );
}
