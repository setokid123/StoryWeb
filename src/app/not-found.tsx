import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() { return <div className="empty-state not-found"><span className="not-found__number">404</span><h1>Trang này đã lạc khỏi câu chuyện</h1><p>Hãy quay về và bắt đầu từ một trang khác.</p><Link className="button button--primary" href="/"><ArrowLeft size={18} /> Về trang chủ</Link></div>; }
