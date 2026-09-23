import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Headphones, Sparkles, Star } from "lucide-react";
import { Cover } from "@/components/cover";
import { StoryCard } from "@/components/story-card";
import { featuredStory, genres } from "@/data/stories";
import { AdSlotContainer } from "@/components/ad-slot-container";
import { getDisplayAd } from "@/lib/display-ads";
import { getCatalogStories } from "@/lib/managed-stories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stories, homeAd] = await Promise.all([getCatalogStories(), getDisplayAd("home_feed")]);
  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow__line" /> MỘT THẾ GIỚI ĐỂ LẠC VÀO</div>
            <h1>Mỗi trang truyện,<br /><em>một chân trời mới.</em></h1>
            <p>Gác lại nhịp sống vội vàng. Tìm một câu chuyện vừa vặn với tâm trạng của bạn, rồi đọc thêm một chương nữa.</p>
            <div className="hero-actions"><Link className="button button--primary" href="/tim-kiem">Khám phá truyện <ArrowRight size={18} /></Link><Link className="text-link" href={`/truyen/${featuredStory.slug}`}>Truyện nổi bật <ArrowUpRight size={18} /></Link></div>
            <div className="hero-stats"><div><strong>{String(stories.length).padStart(2, "0")}</strong><span>Câu chuyện mẫu</span></div><div><strong>{String(genres.length - 1).padStart(2, "0")}</strong><span>Thể loại</span></div><div><strong>02</strong><span>Chế độ đọc</span></div></div>
          </div>
          <div className="hero-art">
            <div className="hero-art__halo" />
            <div className="hero-art__frame"><Cover story={featuredStory} className="hero-art__cover" /></div>
            <div className="hero-art__quote">“Có những cuộc gặp gỡ chỉ đến<br />sau một cơn mưa.”<span>— Thành Phố Sau Cơn Mưa</span></div>
            <span className="hero-art__spark hero-art__spark--one">✦</span><span className="hero-art__spark hero-art__spark--two">✧</span>
          </div>
        </div>
      </section>

      <section className="genre-strip"><div className="container genre-strip__inner"><span>ĐỌC THEO CẢM HỨNG</span><div>{genres.slice(1).map((genre) => <Link key={genre} href={`/tim-kiem?the-loai=${encodeURIComponent(genre)}`}>{genre} <ArrowUpRight size={13} /></Link>)}</div></div></section>

      <section className="section section--cream"><div className="container"><div className="section-heading"><div><div className="eyebrow">TUYỂN CHỌN CHO BẠN</div><h2>Câu chuyện đáng đọc <em>hôm nay</em></h2><p>Những thế giới đang được độc giả yêu thích nhất.</p></div><Link className="section-link" href="/tim-kiem">Xem tất cả <ArrowRight size={18} /></Link></div><div className="story-grid">{stories.slice(0, 4).map((story) => <StoryCard key={story.slug} story={story} />)}</div></div></section>

      <AdSlotContainer config={homeAd} />

      <section className="feature-section"><div className="container feature-grid"><div className="feature-art"><span className="feature-art__ring feature-art__ring--one" /><span className="feature-art__ring feature-art__ring--two" /><BookOpen size={96} strokeWidth={0.8} /><span className="feature-art__small">CHẬM LẠI · ĐỌC SÂU HƠN</span></div><div className="feature-copy"><div className="eyebrow">KHÔNG GIAN CỦA RIÊNG BẠN</div><h2>Đọc theo cách<br /><em>bạn muốn.</em></h2><p>Một góc đọc thật dễ chịu, từ chuyến xe sáng đến những đêm cần một chút bình yên.</p><div className="feature-list"><div><span><Sparkles size={20} /></span><div><strong>Khám phá dễ dàng</strong><p>Tìm truyện theo thể loại và tâm trạng yêu thích.</p></div></div><div><span><Headphones size={20} /></span><div><strong>Không gian đọc tập trung</strong><p>Điều chỉnh cỡ chữ, màu nền và tiếp tục nơi bạn dừng lại.</p></div></div></div><Link className="button button--outline" href="/tim-kiem">Tìm câu chuyện của bạn <ArrowRight size={18} /></Link></div></div></section>

      <section className="section section--cream"><div className="container"><div className="section-heading"><div><div className="eyebrow">LUÔN CÓ ĐIỀU MỚI</div><h2>Vừa lên kệ <em>Thư Các</em></h2><p>Mở một chương mới, biết đâu bạn sẽ tìm thấy điều mình cần.</p></div><Link className="section-link" href="/tim-kiem">Khám phá thêm <ArrowRight size={18} /></Link></div><div className="updates-list">{stories.slice(4, 8).map((story, index) => <Link className="update-row" key={story.slug} href={`/truyen/${story.slug}`}><span className="update-row__number">0{index + 1}</span><Cover story={story} className="update-row__cover" /><span className="update-row__title"><strong>{story.title}</strong><small>{story.author} · {story.genre}</small></span><span className="update-row__meta"><Star size={15} fill="currentColor" /> {story.rating}</span><span className="update-row__time">{story.updated}</span><ArrowUpRight className="update-row__arrow" size={21} /></Link>)}</div></div></section>
    </>
  );
}
