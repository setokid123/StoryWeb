import Link from "next/link";
import { BookOpen } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div><div className="footer-brand"><BookOpen size={21} /> THƯ CÁC</div><p>Một chốn nhỏ cho những câu chuyện lớn.</p></div>
        <div className="footer-links"><Link href="/tim-kiem">Khám phá truyện</Link><Link href="/tu-truyen">Tủ truyện</Link><Link href="/panel">Đăng truyện</Link><a href="mailto:hello@example.com">Liên hệ</a></div>
        <span className="footer-copy">© 2026 Thư Các · Bản dựng thử giao diện</span>
      </div>
    </footer>
  );
}
