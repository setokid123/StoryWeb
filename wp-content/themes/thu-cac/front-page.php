<?php
/**
 * Home page (port of app/page.tsx).
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();

$thu_cac_featured  = thu_cac_featured_story();
$thu_cac_feat_data = $thu_cac_featured ? thu_cac_story( $thu_cac_featured ) : null;
$thu_cac_latest    = thu_cac_stories( array( 'posts_per_page' => 8 ) );
$thu_cac_genres    = thu_cac_genres();
$thu_cac_count     = post_type_exists( 'story' ) ? (int) wp_count_posts( 'story' )->publish : 0;
$thu_cac_quote     = $thu_cac_feat_data ? wp_trim_words( $thu_cac_feat_data['blurb'], 16, '…' ) : '';
?>
<section class="hero-section">
	<div class="container hero-grid">
		<div class="hero-copy">
			<div class="eyebrow"><span class="eyebrow__line"></span> MỘT THẾ GIỚI ĐỂ LẠC VÀO</div>
			<h1>Mỗi trang truyện,<br><em>một chân trời mới.</em></h1>
			<p>Gác lại nhịp sống vội vàng. Tìm một câu chuyện vừa vặn với tâm trạng của bạn, rồi đọc thêm một chương nữa.</p>
			<div class="hero-actions">
				<a class="button button--primary" href="<?php echo esc_url( thu_cac_search_url() ); ?>">Khám phá truyện <?php thu_cac_the_icon( 'arrow-right', 18 ); ?></a>
				<?php if ( $thu_cac_feat_data ) : ?>
					<a class="text-link" href="<?php echo esc_url( $thu_cac_feat_data['url'] ); ?>">Truyện nổi bật <?php thu_cac_the_icon( 'arrow-up-right', 18 ); ?></a>
				<?php endif; ?>
			</div>
			<div class="hero-stats">
				<div><strong><?php echo esc_html( str_pad( (string) $thu_cac_count, 2, '0', STR_PAD_LEFT ) ); ?></strong><span>Câu chuyện</span></div>
				<div><strong><?php echo esc_html( str_pad( (string) count( $thu_cac_genres ), 2, '0', STR_PAD_LEFT ) ); ?></strong><span>Thể loại</span></div>
				<div><strong>02</strong><span>Chế độ đọc</span></div>
			</div>
		</div>
		<div class="hero-art">
			<div class="hero-art__halo"></div>
			<?php if ( $thu_cac_feat_data ) : ?>
				<div class="hero-art__frame"><?php thu_cac_cover( $thu_cac_feat_data, 'hero-art__cover' ); ?></div>
				<?php if ( $thu_cac_quote ) : ?>
					<div class="hero-art__quote">“<?php echo esc_html( $thu_cac_quote ); ?>”<span>— <?php echo esc_html( $thu_cac_feat_data['title'] ); ?></span></div>
				<?php endif; ?>
			<?php endif; ?>
			<span class="hero-art__spark hero-art__spark--one">✦</span><span class="hero-art__spark hero-art__spark--two">✧</span>
		</div>
	</div>
</section>

<?php if ( $thu_cac_genres ) : ?>
<section class="genre-strip"><div class="container genre-strip__inner"><span>ĐỌC THEO CẢM HỨNG</span><div>
	<?php foreach ( $thu_cac_genres as $thu_cac_genre ) : ?>
		<a href="<?php echo esc_url( thu_cac_search_url( array( 'the-loai' => $thu_cac_genre->slug ) ) ); ?>"><?php echo esc_html( $thu_cac_genre->name ); ?> <?php thu_cac_the_icon( 'arrow-up-right', 13 ); ?></a>
	<?php endforeach; ?>
</div></div></section>
<?php endif; ?>

<section class="section section--cream"><div class="container">
	<div class="section-heading"><div><div class="eyebrow">TUYỂN CHỌN CHO BẠN</div><h2>Câu chuyện đáng đọc <em>hôm nay</em></h2><p>Những thế giới đang được độc giả yêu thích nhất.</p></div><a class="section-link" href="<?php echo esc_url( thu_cac_search_url() ); ?>">Xem tất cả <?php thu_cac_the_icon( 'arrow-right', 18 ); ?></a></div>
	<?php if ( $thu_cac_latest ) : ?>
		<div class="story-grid">
			<?php foreach ( array_slice( $thu_cac_latest, 0, 4 ) as $thu_cac_post ) : ?>
				<?php thu_cac_story_card( thu_cac_story( $thu_cac_post ) ); ?>
			<?php endforeach; ?>
		</div>
	<?php else : ?>
		<div class="empty-state"><?php thu_cac_the_icon( 'book-open', 40, array( 'stroke-width' => '1.2' ) ); ?><h2>Kệ sách đang chờ câu chuyện đầu tiên</h2><p>Truyện sẽ hiện ở đây khi được xuất bản.</p></div>
	<?php endif; ?>
</div></section>

<?php thu_cac_ad_slot( 'home_feed' ); ?>

<section class="feature-section"><div class="container feature-grid">
	<div class="feature-art"><span class="feature-art__ring feature-art__ring--one"></span><span class="feature-art__ring feature-art__ring--two"></span><?php thu_cac_the_icon( 'book-open', 96, array( 'stroke-width' => '0.8' ) ); ?><span class="feature-art__small">CHẬM LẠI · ĐỌC SÂU HƠN</span></div>
	<div class="feature-copy"><div class="eyebrow">KHÔNG GIAN CỦA RIÊNG BẠN</div><h2>Đọc theo cách<br><em>bạn muốn.</em></h2><p>Một góc đọc thật dễ chịu, từ chuyến xe sáng đến những đêm cần một chút bình yên.</p>
		<div class="feature-list">
			<div><span><?php thu_cac_the_icon( 'sparkles', 20 ); ?></span><div><strong>Khám phá dễ dàng</strong><p>Tìm truyện theo thể loại và tâm trạng yêu thích.</p></div></div>
			<div><span><?php thu_cac_the_icon( 'headphones', 20 ); ?></span><div><strong>Không gian đọc tập trung</strong><p>Điều chỉnh cỡ chữ, màu nền và tiếp tục nơi bạn dừng lại.</p></div></div>
		</div>
		<a class="button button--outline" href="<?php echo esc_url( thu_cac_search_url() ); ?>">Tìm câu chuyện của bạn <?php thu_cac_the_icon( 'arrow-right', 18 ); ?></a>
	</div>
</div></section>

<?php if ( count( $thu_cac_latest ) > 4 ) : ?>
<section class="section section--cream"><div class="container">
	<div class="section-heading"><div><div class="eyebrow">LUÔN CÓ ĐIỀU MỚI</div><h2>Vừa lên kệ <em>Thư Các</em></h2><p>Mở một chương mới, biết đâu bạn sẽ tìm thấy điều mình cần.</p></div><a class="section-link" href="<?php echo esc_url( thu_cac_search_url() ); ?>">Khám phá thêm <?php thu_cac_the_icon( 'arrow-right', 18 ); ?></a></div>
	<div class="updates-list">
		<?php foreach ( array_slice( $thu_cac_latest, 4, 4 ) as $thu_cac_index => $thu_cac_post ) : ?>
			<?php $thu_cac_item = thu_cac_story( $thu_cac_post ); ?>
			<a class="update-row" href="<?php echo esc_url( $thu_cac_item['url'] ); ?>">
				<span class="update-row__number">0<?php echo (int) $thu_cac_index + 1; ?></span>
				<?php thu_cac_cover( $thu_cac_item, 'update-row__cover' ); ?>
				<span class="update-row__title"><strong><?php echo esc_html( $thu_cac_item['title'] ); ?></strong><small><?php echo esc_html( $thu_cac_item['author'] . ' · ' . $thu_cac_item['genre'] ); ?></small></span>
				<span class="update-row__meta"><?php thu_cac_the_icon( 'star', 15, array( 'fill' => 'currentColor' ) ); ?> <?php echo esc_html( $thu_cac_item['rating'] ); ?></span>
				<span class="update-row__time"><?php echo esc_html( $thu_cac_item['updated'] ); ?></span>
				<?php thu_cac_the_icon( 'arrow-up-right', 21, array( 'class' => 'update-row__arrow' ) ); ?>
			</a>
		<?php endforeach; ?>
	</div>
</div></section>
<?php endif; ?>
<?php
get_footer();
