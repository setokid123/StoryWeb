<?php
/**
 * Home: the station. Hero with the featured story as a glass ticket, genre "lines", today's picks (a daily
 * random shelf, the same for everyone all day) and the departure board of the newest chapters.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();

$thu_cac_featured  = thu_cac_featured_story();
$thu_cac_feat      = $thu_cac_featured ? thu_cac_story( $thu_cac_featured ) : null;
$thu_cac_picks     = thu_cac_stories(
	array(
		'posts_per_page' => 8,
		'orderby'        => 'RAND(' . (int) wp_date( 'Ymd' ) . ')',
		'post__not_in'   => $thu_cac_featured ? array( $thu_cac_featured->ID ) : array(),
	)
);
$thu_cac_board     = thu_cac_latest_chapters( 8 );
$thu_cac_genres    = thu_cac_genres();
$thu_cac_count     = post_type_exists( 'story' ) ? (int) wp_count_posts( 'story' )->publish : 0;
$thu_cac_chapters  = post_type_exists( 'chapter' ) ? (int) wp_count_posts( 'chapter' )->publish : 0;
$thu_cac_grid      = array();
$thu_cac_stack     = array();
foreach ( $thu_cac_picks as $thu_cac_post ) {
	$thu_cac_item   = thu_cac_story( $thu_cac_post );
	$thu_cac_grid[] = $thu_cac_item;
	if ( ! $thu_cac_stack && $thu_cac_item['thumbnail_id'] ) {
		$thu_cac_stack[] = $thu_cac_item;
	}
}
?>
<section class="hero">
	<?php get_template_part( 'template-parts/scene' ); ?>
	<?php if ( 'halloween' === thu_cac_season() ) : ?>
		<div class="hw-lantern" aria-hidden="true"></div>
	<?php endif; ?>
	<div class="container hero__grid">
		<div class="hero__copy">
			<?php
			$thu_cac_season_chips = array(
				'halloween' => array( '🎃', 'Đêm Halloween: chuyến tàu kinh dị đã vào ga' ),
				'christmas' => array( '🎄', 'Giáng sinh trên sân ga: chuyến tàu truyện ngọt' ),
			);
			?>
			<?php if ( isset( $thu_cac_season_chips[ thu_cac_season() ] ) ) : ?>
				<a class="chip lg chip--season" href="<?php echo esc_url( thu_cac_season_link() ); ?>"><span aria-hidden="true"><?php echo esc_html( $thu_cac_season_chips[ thu_cac_season() ][0] ); ?></span> <?php echo esc_html( $thu_cac_season_chips[ thu_cac_season() ][1] ); ?></a>
			<?php else : ?>
				<span class="chip lg"><span class="chip__dot"></span> Ga Trạm Truyện 2D · chuyến mới mỗi ngày</span>
			<?php endif; ?>
			<h1 class="hero__title">Chuyến tàu truyện <em>sắp khởi hành</em></h1>
			<p class="hero__lead">Chọn một tấm vé, lên tàu và đọc tới trạm cuối. <?php echo $thu_cac_count > 0 ? esc_html( number_format_i18n( $thu_cac_count ) . ' câu chuyện đang chờ ở sân ga.' ) : 'Những câu chuyện đầu tiên sắp cập bến.'; ?></p>
			<form class="search-pill lg" data-refract action="<?php echo esc_url( thu_cac_search_url() ); ?>" method="get" role="search">
				<?php thu_cac_the_icon( 'search', 20 ); ?>
				<input type="search" name="q" placeholder="Tìm tên truyện, tác giả…" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="Tìm truyện" maxlength="100">
				<button class="button button--primary" type="submit">Tìm vé</button>
			</form>
			<div class="hero__stats">
				<span class="stat lg"><strong><?php echo esc_html( number_format_i18n( $thu_cac_count ) ); ?></strong> câu chuyện</span>
				<span class="stat lg"><strong><?php echo esc_html( number_format_i18n( count( $thu_cac_genres ) ) ); ?></strong> tuyến thể loại</span>
				<span class="stat lg"><strong><?php echo esc_html( number_format_i18n( $thu_cac_chapters ) ); ?></strong> chương</span>
			</div>
		</div>

		<?php if ( $thu_cac_feat ) : ?>
			<div class="hero__stage">
				<?php foreach ( $thu_cac_stack as $thu_cac_i => $thu_cac_s ) : ?>
					<div class="hero__stack hero__stack--<?php echo (int) $thu_cac_i + 1; ?>" aria-hidden="true"><?php thu_cac_cover( $thu_cac_s, 'hero__stack-cover', array( 'sizes' => '200px' ) ); ?></div>
				<?php endforeach; ?>
				<article class="ticket lg" data-refract data-tilt>
					<header class="ticket__head">
						<span class="live"><i></i> Chuyến nổi bật</span>
						<span class="ticket__no">Vé số <?php echo esc_html( str_pad( (string) $thu_cac_feat['id'], 5, '0', STR_PAD_LEFT ) ); ?></span>
					</header>
					<div class="ticket__body">
						<a class="ticket__cover" href="<?php echo esc_url( $thu_cac_feat['url'] ); ?>" tabindex="-1" aria-hidden="true"><?php thu_cac_cover( $thu_cac_feat, 'ticket__cover-img', array( 'eager' => true, 'sizes' => '(max-width: 600px) 40vw, 200px' ) ); ?></a>
						<div class="ticket__info">
							<?php thu_cac_line_pill( $thu_cac_feat['genre'], '', $thu_cac_feat['genre_url'] ); ?>
							<h2 class="ticket__title"><a href="<?php echo esc_url( $thu_cac_feat['url'] ); ?>"><?php echo esc_html( $thu_cac_feat['title'] ); ?></a></h2>
							<p class="ticket__author"><?php echo esc_html( $thu_cac_feat['author_label'] ); ?></p>
							<?php if ( $thu_cac_feat['quote'] ) : ?>
								<blockquote class="ticket__quote">“<?php echo esc_html( $thu_cac_feat['quote'] ); ?>”</blockquote>
							<?php endif; ?>
							<div class="ticket__meta">
								<?php if ( '' !== $thu_cac_feat['rating'] ) : ?>
									<span class="ticket__rating"><?php thu_cac_the_icon( 'star', 14, array( 'fill' => 'currentColor' ) ); ?> <?php echo esc_html( $thu_cac_feat['rating'] ); ?></span>
								<?php endif; ?>
								<?php $thu_cac_feat_views = thu_cac_views( $thu_cac_feat['id'] ); ?>
								<?php if ( null !== $thu_cac_feat_views ) : ?>
									<span><?php thu_cac_the_icon( 'eye', 14 ); ?> <?php echo esc_html( thu_cac_compact_number( $thu_cac_feat_views ) ); ?> lượt xem</span>
								<?php endif; ?>
								<span><?php thu_cac_the_icon( 'book-open', 14 ); ?> <?php echo (int) $thu_cac_feat['chapters']; ?> chương</span>
								<span><?php echo esc_html( $thu_cac_feat['status'] ); ?></span>
							</div>
						</div>
					</div>
					<footer class="ticket__stub">
						<a class="button button--primary" href="<?php echo esc_url( $thu_cac_feat['url'] ); ?>">Lên tàu đọc ngay <?php thu_cac_the_icon( 'arrow-right', 17 ); ?></a>
						<span class="ticket__barcode" aria-hidden="true"></span>
					</footer>
				</article>
			</div>
		<?php endif; ?>
	</div>
</section>

<?php if ( $thu_cac_genres ) : ?>
<section class="section section--block lines">
	<div class="container">
		<div class="block lg">
		<div class="section-head">
			<div><span class="eyebrow"><i></i> Chọn tuyến</span><h2 class="section-title">Đi theo <em>cảm hứng</em></h2></div>
			<a class="link-arrow" href="<?php echo esc_url( thu_cac_search_url() ); ?>">Bản đồ tuyến <?php thu_cac_the_icon( 'arrow-right', 17 ); ?></a>
		</div>
		<?php
		$thu_cac_lines = array_slice( $thu_cac_genres, 0, 14 );
		$thu_cac_n     = count( $thu_cac_lines );
		// Columns that leave no half-empty row: one row for a few lines, else two rows (wide) or three (narrower).
		$thu_cac_c2 = $thu_cac_n <= 7 ? $thu_cac_n : (int) ceil( $thu_cac_n / 2 );
		$thu_cac_c3 = $thu_cac_n <= 5 ? $thu_cac_n : (int) ceil( $thu_cac_n / 3 );
		?>
		<div class="lines__track" style="--c2:<?php echo (int) $thu_cac_c2; ?>;--c3:<?php echo (int) $thu_cac_c3; ?>">
			<?php foreach ( $thu_cac_lines as $thu_cac_genre ) : ?>
				<?php $thu_cac_line = thu_cac_line( $thu_cac_genre->name ); ?>
				<a class="line-chip lg lg-glow" style="--line:<?php echo esc_attr( $thu_cac_line['color'] ); ?>" href="<?php echo esc_url( thu_cac_search_url( array( 'the-loai' => $thu_cac_genre->slug ) ) ); ?>">
					<span class="line-chip__code"><?php echo esc_html( $thu_cac_line['code'] ); ?></span>
					<span class="line-chip__text"><strong><?php echo esc_html( $thu_cac_genre->name ); ?></strong><small><?php echo esc_html( number_format_i18n( (int) $thu_cac_genre->count ) ); ?> truyện</small></span>
				</a>
			<?php endforeach; ?>
		</div>
		</div>
	</div>
</section>
<?php endif; ?>

<section class="section section--block">
	<div class="container">
		<div class="block lg">
		<div class="section-head">
			<div><span class="eyebrow"><i></i> Đề cử hôm nay</span><h2 class="section-title">Kệ vé <em>của ngày hôm nay</em></h2><p>Mỗi ngày một kệ mới, chọn từ khắp các tuyến. Lên sớm, chọn ghế đẹp.</p></div>
			<a class="link-arrow" href="<?php echo esc_url( thu_cac_search_url() ); ?>">Xem tất cả <?php thu_cac_the_icon( 'arrow-right', 17 ); ?></a>
		</div>
		<?php if ( $thu_cac_grid ) : ?>
			<div class="story-grid">
				<?php foreach ( $thu_cac_grid as $thu_cac_item ) : ?>
					<?php thu_cac_story_card( $thu_cac_item ); ?>
				<?php endforeach; ?>
			</div>
		<?php elseif ( ! $thu_cac_feat ) : ?>
			<div class="empty-state lg"><?php thu_cac_the_icon( 'tram-front', 40, array( 'stroke-width' => '1.4' ) ); ?><h2>Sân ga đang chờ chuyến tàu đầu tiên</h2><p>Truyện sẽ hiện ở đây khi được xuất bản.</p></div>
		<?php endif; ?>
		</div>
	</div>
</section>

<?php thu_cac_ad_slot( 'home_feed' ); ?>

<?php $thu_cac_ranked = thu_cac_ranking_available() && ( thu_cac_most_viewed( 'tuan', 1 ) || thu_cac_most_viewed( 'tat-ca', 1 ) ); ?>
<?php if ( $thu_cac_ranked || $thu_cac_board ) : ?>
<?php /* The station hall: two boards side by side, the busiest cars and the newest arrivals. */ ?>
<section class="section section--block hall<?php echo $thu_cac_ranked && $thu_cac_board ? ' hall--two' : ''; ?>">
	<div class="container hall__grid">
		<?php if ( $thu_cac_ranked ) : ?>
			<?php get_template_part( 'template-parts/ranking', null, array( 'limit' => 7, 'period' => thu_cac_most_viewed( 'tuan', 1 ) ? 'tuan' : 'tat-ca' ) ); ?>
		<?php endif; ?>
		<?php if ( $thu_cac_board ) : ?>
		<div class="board lg">
			<header class="board__head">
				<div><span class="eyebrow"><i></i> Bảng giờ tàu</span><h2 class="section-title">Chương mới <em>vừa đến ga</em></h2></div>
				<div class="board__clock"><span class="live"><i></i> Mới nhất</span><time data-board-clock><?php echo esc_html( wp_date( 'H:i' ) ); ?></time></div>
			</header>
			<div class="board__cols" aria-hidden="true"><span>Giờ</span><span>Chuyến</span><span>Tuyến</span><span>Vé</span></div>
			<ol class="board__rows">
				<?php foreach ( $thu_cac_board as $thu_cac_row ) : ?>
					<li>
						<a class="board-row" href="<?php echo esc_url( $thu_cac_row['url'] ); ?>">
							<span class="board-row__time"><?php echo esc_html( thu_cac_board_time( $thu_cac_row['time'] ) ); ?></span>
							<span class="board-row__main">
								<?php thu_cac_cover( $thu_cac_row['story'], 'board-row__cover', array( 'decorative' => true, 'sizes' => '48px' ) ); ?>
								<span class="board-row__text"><strong><?php echo esc_html( $thu_cac_row['story']['title'] ); ?></strong><small><?php echo esc_html( preg_match( '/^\s*chương\s+0*' . (int) $thu_cac_row['number'] . '(?!\d)/iu', (string) $thu_cac_row['title'] ) ? $thu_cac_row['title'] : 'Chương ' . (int) $thu_cac_row['number'] . ' · ' . $thu_cac_row['title'] ); ?></small></span>
							</span>
							<span class="board-row__line"><?php thu_cac_line_pill( $thu_cac_row['story']['genre'], 'line-pill--sm' ); ?></span>
							<span class="board-row__ticket<?php echo $thu_cac_row['locked'] ? ' is-locked' : ''; ?>"><?php echo $thu_cac_row['locked'] ? thu_cac_icon( 'lock-keyhole', 14 ) . ' Cần mở khóa' : thu_cac_icon( 'ticket', 14 ) . ' Miễn phí'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed icons and text. ?></span>
						</a>
					</li>
				<?php endforeach; ?>
			</ol>
		</div>
		<?php endif; ?>
	</div>
</section>
<?php endif; ?>

<section class="section section--block cabin">
	<div class="container">
		<div class="block lg cabin__grid">
		<div class="cabin__art" aria-hidden="true">
			<div class="phone lg">
				<div class="phone__bar lg"><span></span><b>Chương 12</b><span></span></div>
				<div class="phone__page">
					<i class="phone__h"></i><i></i><i></i><i class="is-short"></i><i></i><i></i><i></i><i class="is-short"></i><i></i><i></i>
				</div>
				<div class="phone__dock lg"><span></span><span></span><span class="is-on"></span><span></span></div>
			</div>
			<div class="cabin__bubble lg">Aa <small>19px · Văn học</small></div>
			<div class="cabin__bubble cabin__bubble--b lg"><?php thu_cac_the_icon( 'moon', 16 ); ?> Tối dịu mắt</div>
		</div>
		<div class="cabin__copy">
			<span class="eyebrow"><i></i> Khoang đọc</span>
			<h2 class="section-title">Đọc theo cách <em>của riêng bạn</em></h2>
			<p>Một khoang tàu yên tĩnh cho mỗi chương: chữ rõ, nền dịu, thanh điều khiển bằng kính luôn ở trong tầm tay.</p>
			<ul class="cabin__list">
				<li><span class="cabin__icon lg"><?php thu_cac_the_icon( 'sun', 18 ); ?></span><div><strong>Sáng – Tối theo giờ đọc</strong><p>Đổi một chạm, ghi nhớ cho lần sau.</p></div></li>
				<li><span class="cabin__icon lg"><?php thu_cac_the_icon( 'type', 18 ); ?></span><div><strong>Chữ của bạn, cỡ của bạn</strong><p>Phông Văn học hay Hiện đại, cỡ 16–26px, giãn dòng, độ rộng cột.</p></div></li>
				<li><span class="cabin__icon lg"><?php thu_cac_the_icon( 'library-big', 18 ); ?></span><div><strong>Tủ truyện ngay trên máy</strong><p>Lưu truyện yêu thích, quay lại đúng chỗ bất cứ lúc nào.</p></div></li>
			</ul>
			<a class="button button--glass lg lg-glow" href="<?php echo esc_url( thu_cac_search_url() ); ?>">Tìm chuyến tàu của bạn <?php thu_cac_the_icon( 'arrow-right', 17 ); ?></a>
		</div>
		</div>
	</div>
</section>
<?php
get_footer();
