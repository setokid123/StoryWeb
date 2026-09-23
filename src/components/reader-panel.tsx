"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronLeft, ChevronRight, Clock3, LockKeyhole, Minus, Plus, Sun, Moon, Type, X } from "lucide-react";
import type { Story } from "@/data/stories";

type ReaderPanelProps = { story: Story; chapter: number; title: string; content: string | null; gateEnabled: boolean; unlockExpiresAt: number | null };

function subscribePreferences(callback: () => void) {
  window.addEventListener("storyweb:preference-change", callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener("storyweb:preference-change", callback); window.removeEventListener("storage", callback); };
}

function getFontSize() {
  const size = Number(localStorage.getItem("storyweb:font-size"));
  return size >= 16 && size <= 26 ? size : 19;
}

export function ReaderPanel({ story, chapter, title, content, gateEnabled, unlockExpiresAt }: ReaderPanelProps) {
  const router = useRouter();
  const fontSize = useSyncExternalStore(subscribePreferences, getFontSize, () => 19);
  const night = useSyncExternalStore(subscribePreferences, () => localStorage.getItem("storyweb:night") === "true", () => false);
  const locked = content === null;

  useEffect(() => {
    if (!locked) localStorage.setItem(`storyweb:progress:${story.slug}`, String(chapter));
  }, [chapter, story.slug, locked]);

  useEffect(() => {
    if (!locked || !gateEnabled) return;
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [locked, gateEnabled, router]);

  function changeFont(next: number) {
    const value = Math.max(16, Math.min(26, next));
    localStorage.setItem("storyweb:font-size", String(value));
    window.dispatchEvent(new Event("storyweb:preference-change"));
  }

  function toggleNight() {
    localStorage.setItem("storyweb:night", String(!night));
    window.dispatchEvent(new Event("storyweb:preference-change"));
  }

  return <div className={`reader-shell ${night ? "reader-shell--night" : ""}`}>
    <div className="container reader-shell__inner">
      <div className="reader-toolbar"><Link href={`/truyen/${story.slug}`}><ChevronLeft size={17} /> Mục lục</Link><div className="reader-toolbar__settings"><span><Type size={17} /> Cỡ chữ</span><button type="button" aria-label="Giảm cỡ chữ" onClick={() => changeFont(fontSize - 1)}><Minus size={16} /></button><strong>{fontSize}</strong><button type="button" aria-label="Tăng cỡ chữ" onClick={() => changeFont(fontSize + 1)}><Plus size={16} /></button><button type="button" aria-label={night ? "Chế độ sáng" : "Chế độ tối"} onClick={toggleNight}>{night ? <Sun size={18} /> : <Moon size={18} />}</button></div></div>
      <article className="reader-article"><div className="eyebrow">{story.title} · CHƯƠNG {chapter}</div><h1>{title}</h1><div className="reader-rule">✦</div>{locked ? <div className="unlock-backdrop"><div className="locked-panel locked-panel--dialog" role="dialog" aria-modal="true" aria-labelledby="unlock-title"><Link className="locked-panel__close" href={`/truyen/${story.slug}`} aria-label="Đóng và quay về mục lục"><X size={20} /></Link><span className="locked-panel__icon"><LockKeyhole size={28} /></span><div className="eyebrow">CHƯƠNG {chapter} · NỘI DUNG KHÓA</div><h2 id="unlock-title">Mở trang truyện tiếp theo</h2>{gateEnabled ? <><p>Mở liên kết giới thiệu một lần để đọc các chương khóa trong 5 phút. Khi hết thời gian, bạn cần mở lại liên kết trước khi sang chương mới.</p><a className="button button--primary" href="/unlock/visit" target="_blank" rel="noopener noreferrer">Mở liên kết giới thiệu <ArrowUpRight size={17} /></a><span className="locked-panel__hint">Trang sẽ mở trong tab mới. Quay lại đây để tiếp tục đọc.</span></> : <><p>Luồng mở khóa 5 phút đã sẵn sàng nhưng chưa có link và xác nhận cần thiết để kích hoạt. Hiện bạn có thể đọc chương miễn phí.</p><Link href={`/truyen/${story.slug}`} className="button button--outline">Quay lại mục lục</Link></>}</div></div> : <>{unlockExpiresAt && chapter > story.freeChapters && <div className="reader-access-note"><Clock3 size={15} /> Đã mở quyền đọc cho các chương tiếp theo trong 5 phút kể từ lần nhấp liên kết.</div>}<div className="reader-text" style={{ fontSize: `${fontSize}px` }}>{content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="reader-end">— Hết chương {chapter} —</div></div></>}</article>
      <div className="reader-pager">{chapter > 1 ? <Link href={`/doc/${story.slug}/${chapter - 1}`}><ChevronLeft size={18} /> Chương trước</Link> : <span />}{chapter < story.chapters ? <Link href={`/doc/${story.slug}/${chapter + 1}`}>Chương tiếp <ChevronRight size={18} /></Link> : <span />}</div>
    </div>
  </div>;
}
