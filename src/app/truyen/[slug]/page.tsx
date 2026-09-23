import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Clock3, Eye, LockKeyhole, Star } from "lucide-react";
import { BookshelfButton } from "@/components/bookshelf-button";
import { Cover } from "@/components/cover";
import { chapterTitle } from "@/data/stories";
import { AdSlotContainer } from "@/components/ad-slot-container";
import { getDisplayAd } from "@/lib/display-ads";
import { getCatalogStories, getCatalogStory } from "@/lib/managed-stories";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> { const result = await getCatalogStory((await params).slug); return { title: result?.story.title ?? "Không tìm thấy truyện", description: result?.story.blurb }; }

export default async function StoryPage({ params }: Props) {
  const result = await getCatalogStory((await params).slug);
  if (!result) notFound();
  const { story, managed } = result;
  const related = (await getCatalogStories()).filter((item) => item.slug !== story.slug && (item.genre === story.genre || item.tags.some((tag) => story.tags.includes(tag)))).slice(0, 3);
  const detailAd = await getDisplayAd("story_detail");

  return <>
    <section className="detail-hero"><div className="container"><div className="breadcrumbs"><Link href="/">Trang chủ</Link><span>/</span><Link href="/tim-kiem">Khám phá</Link><span>/</span><span>{story.title}</span></div><div className="detail-grid"><Cover story={story} className="detail-cover" /><div className="detail-copy"><div className="eyebrow">{story.genre} · {story.status}</div><h1>{story.title}</h1><p className="detail-author">Tác giả <strong>{story.author}</strong></p><div className="detail-metrics"><span><Star size={17} fill="currentColor" /> <strong>{story.rating}</strong> đánh giá</span><span><Eye size={18} /> {story.reads} lượt đọc</span><span><BookOpen size={18} /> {story.chapters} chương</span></div><p className="detail-blurb">{story.blurb}</p><div className="tag-list">{story.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="detail-actions"><Link className="button button--primary" href={`/doc/${story.slug}/1`}>Đọc từ đầu <ArrowRight size={18} /></Link><BookshelfButton slug={story.slug} /></div><div className="detail-updated"><Clock3 size={15} /> Cập nhật: {story.updated}</div></div></div></div></section>
    <AdSlotContainer config={detailAd} />
    <section className="section section--cream"><div className="container detail-bottom"><div><div className="section-heading section-heading--compact"><div><div className="eyebrow">LẬT MỞ TỪNG TRANG</div><h2>Danh sách <em>chương</em></h2></div><span>{story.chapters} chương · {story.freeChapters} chương miễn phí</span></div><div className="chapter-list">{Array.from({ length: story.chapters }, (_, index) => { const chapter = index + 1; const locked = chapter > story.freeChapters; return <Link href={`/doc/${story.slug}/${chapter}`} key={chapter} className="chapter-row"><span className="chapter-row__index">{String(chapter).padStart(2, "0")}</span><span className="chapter-row__name">{managed?.chapters[index]?.title ?? chapterTitle(chapter)}</span><span className={locked ? "chapter-row__status chapter-row__status--locked" : "chapter-row__status"}>{locked ? <><LockKeyhole size={14} /> Khóa</> : "Miễn phí"}</span><ArrowRight size={17} /></Link>; })}</div></div><aside className="detail-aside"><div className="aside-card"><span className="eyebrow">GỢI Ý TIẾP THEO</span><h3>Những câu chuyện cùng cảm hứng</h3>{related.map((item) => <Link key={item.slug} href={`/truyen/${item.slug}`}><Cover story={item} className="aside-cover" /><span><strong>{item.title}</strong><small>{item.author}</small></span><ArrowRight size={16} /></Link>)}</div></aside></div></section>
  </>;
}
