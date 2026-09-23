import type { Metadata } from "next";
import { BookshelfList } from "@/components/bookshelf-list";
import { getCatalogStories } from "@/lib/managed-stories";

export const metadata: Metadata = { title: "Tủ truyện của bạn" };
export const dynamic = "force-dynamic";

export default async function BookshelfPage() { return <section className="section section--cream bookshelf-page"><div className="container"><div className="page-heading"><div className="eyebrow">GÓC NHỎ CỦA RIÊNG BẠN</div><h1>Tủ truyện <em>của tôi</em></h1><p>Những câu chuyện bạn muốn quay lại, bất cứ lúc nào.</p></div><BookshelfList stories={await getCatalogStories()} /></div></section>; }
