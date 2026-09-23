import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { StoryCard } from "@/components/story-card";
import { genres } from "@/data/stories";
import { AdSlotContainer } from "@/components/ad-slot-container";
import { getDisplayAd } from "@/lib/display-ads";
import { getCatalogStories } from "@/lib/managed-stories";

export const metadata: Metadata = { title: "Khám phá truyện" };
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string; "the-loai"?: string }> };

export default async function DiscoverPage({ searchParams }: Props) {
  const [stories, searchAd] = await Promise.all([getCatalogStories(), getDisplayAd("search_results")]);
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLocaleLowerCase("vi");
  const genre = params["the-loai"] ?? "Tất cả";
  const filtered = stories.filter((story) => (genre === "Tất cả" || story.genre === genre) && (!query || `${story.title} ${story.author} ${story.genre} ${story.tags.join(" ")}`.toLocaleLowerCase("vi").includes(query)));
  const filterHref = (item: string) => {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (item !== "Tất cả") next.set("the-loai", item);
    return `/tim-kiem${next.size ? `?${next}` : ""}`;
  };
  return <section className="section section--cream discover-page"><div className="container"><div className="page-heading"><div className="eyebrow">THƯ VIỆN CỦA BẠN</div><h1>Khám phá <em>truyện hay</em></h1><p>Một câu chuyện phù hợp luôn ở đâu đó trên kệ sách.</p></div><form className="search-form" action="/tim-kiem" method="get"><Search size={21} /><input type="search" name="q" placeholder="Tìm tên truyện, tác giả, thể loại..." defaultValue={params.q ?? ""} aria-label="Tìm truyện" />{genre !== "Tất cả" && <input type="hidden" name="the-loai" value={genre} />}<button type="submit">Tìm kiếm <span>→</span></button></form><div className="filter-row"><span><SlidersHorizontal size={17} /> Thể loại</span><div>{genres.map((item) => <Link key={item} className={genre === item ? "filter-chip is-selected" : "filter-chip"} href={filterHref(item)}>{item}</Link>)}</div></div>{filtered.length > 0 && <AdSlotContainer config={searchAd} />}<div className="result-heading"><h2>{query ? `Kết quả cho “${params.q}”` : genre === "Tất cả" ? "Tất cả câu chuyện" : `Truyện ${genre}`}</h2><span>{filtered.length} truyện</span></div>{filtered.length > 0 ? <div className="story-grid">{filtered.map((story) => <StoryCard key={story.slug} story={story} />)}</div> : <div className="empty-state"><Search size={38} /><h2>Chưa tìm thấy câu chuyện phù hợp</h2><p>Thử một từ khóa hoặc thể loại khác nhé.</p><Link href="/tim-kiem" className="button button--primary">Xem tất cả truyện</Link></div>}</div></section>;
}
