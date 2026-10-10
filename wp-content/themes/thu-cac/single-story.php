<?php
/**
 * Story detail: the cover's ambient light behind a glass info panel, and the chapters as stops on a metro line.
 * The chapter list is paginated (100 per page) so stories with thousands of chapters stay light.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();

$thu_cac_post  = get_queried_object();
$thu_cac_story = thu_cac_story( $thu_cac_post );
$thu_cac_line  = thu_cac_line( $thu_cac_story['genre'] );
$thu_cac_per   = 100;
// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- public read-only pager.
$thu_cac_page  = isset( $_GET['trang-chuong'] ) ? max( 1, absint( $_GET['trang-chuong'] ) ) : 1;
$thu_cac_rows  = function_exists( 'storyweb_story_chapters' ) ? storyweb_story_chapters( $thu_cac_post->ID, $thu_cac_per, ( $thu_cac_page - 1 ) * $thu_cac_per ) : array();
$thu_cac_pages = max( 1, (int) ceil( $thu_cac_story['chapters'] / $thu_cac_per ) );
$thu_cac_first = function_exists( 'storyweb_story_chapters' ) ? storyweb_story_chapters( $thu_cac_post->ID, 1 ) : array();
$thu_cac_related = $thu_cac_story['genre_slug'] ? thu_cac_stories(
	array(
		'posts_per_page' => 4,
		'post__not_in'   => array( $thu_cac_post->ID ),
		'tax_query'      => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			array(
				'taxonomy' => 'the_loai',
				'field'    => 'slug',
				'terms'    => $thu_cac_story['genre_slug'],
			),
		),
	)
) : array();
// "Đọc tiếp" link template for site.js (reading progress lives in the visitor's browser).
$thu_cac_continue = function_exists( 'storyweb_chapter_url' ) ? str_replace( '999999999', '%d', storyweb_chapter_url( $thu_cac_post, 999999999 ) ) : '';
// Slugs the story had before its links used its code: site.js moves this browser's progress and bookshelf over.
$thu_cac_old_slugs = function_exists( 'storyweb_story_old_slugs' ) ? implode( ',', storyweb_story_old_slugs( $thu_cac_post ) ) : '';
?>
<?php thu_cac_ambient( $thu_cac_story ); ?>
<section class="detail">
	<div class="container">
		<nav class="breadcrumbs lg" aria-label="Đường dẫn"><a href="<?php echo esc_url( home_url( '/' ) ); ?>">Trang chủ</a><span aria-hidden="true">›</span><a href="<?php echo esc_url( thu_cac_search_url() ); ?>">Khám phá</a><span aria-hidden="true">›</span><span aria-current="page"><?php echo esc_html( $thu_cac_story['title'] ); ?></span></nav>
		<div class="detail__grid">
			<div class="detail__cover-wrap">
				<?php thu_cac_cover( $thu_cac_story, 'detail-cover', array( 'eager' => true, 'sizes' => '(max-width: 600px) 56vw, 320px' ) ); ?>
				<span class="detail__reflection" aria-hidden="true"></span>
			</div>
			<div class="detail__panel lg">
				<div class="detail__tags">
					<?php thu_cac_line_pill( $thu_cac_story['genre'], '', $thu_cac_story['genre_url'] ); ?>
					<span class="status-chip<?php echo $thu_cac_story['completed'] ? ' is-done' : ''; ?>"><i></i><?php echo esc_html( $thu_cac_story['status'] ); ?></span>
				</div>
				<h1 class="detail__title"><?php echo esc_html( $thu_cac_story['title'] ); ?></h1>
				<p class="detail__author"><?php if ( $thu_cac_story['author'] ) : ?>Tác giả <strong><?php echo esc_html( $thu_cac_story['author'] ); ?></strong><?php else : ?>Chưa rõ tác giả<?php endif; ?></p>
				<div class="detail__metrics">
					<?php if ( '' !== $thu_cac_story['rating'] ) : ?>
						<span class="metric lg"><?php thu_cac_the_icon( 'star', 16, array( 'fill' => 'currentColor' ) ); ?><strong><?php echo esc_html( $thu_cac_story['rating'] ); ?></strong><small>đánh giá</small></span>
					<?php endif; ?>
					<?php $thu_cac_views = thu_cac_views( $thu_cac_post->ID ); ?>
					<?php if ( null !== $thu_cac_views ) : ?>
						<span class="metric lg" title="<?php echo esc_attr( number_format_i18n( $thu_cac_views ) . ' lượt xem' ); ?>"><?php thu_cac_the_icon( 'eye', 16 ); ?><strong><?php echo esc_html( thu_cac_compact_number( $thu_cac_views ) ); ?></strong><small>lượt xem</small></span>
					<?php elseif ( '' !== $thu_cac_story['reads'] ) : ?>
						<span class="metric lg"><?php thu_cac_the_icon( 'eye', 16 ); ?><strong><?php echo esc_html( $thu_cac_story['reads'] ); ?></strong><small>lượt đọc</small></span>
					<?php endif; ?>
					<span class="metric lg"><?php thu_cac_the_icon( 'route', 16 ); ?><strong><?php echo (int) $thu_cac_story['chapters']; ?></strong><small>chương</small></span>
				</div>
				<div class="detail__blurb" id="mo-ta-truyen" data-blurb><?php echo wp_kses_post( wpautop( $thu_cac_post->post_content ? $thu_cac_post->post_content : $thu_cac_story['blurb'] ) ); ?></div>
				<button type="button" class="detail__more" data-blurb-toggle aria-controls="mo-ta-truyen" aria-expanded="false" hidden><span data-blurb-label>Xem thêm</span> <?php thu_cac_the_icon( 'chevron-down', 16 ); ?></button>
				<?php if ( $thu_cac_story['tags'] ) : ?>
					<div class="tag-list"><?php foreach ( $thu_cac_story['tags'] as $thu_cac_tag ) : ?><span>#<?php echo esc_html( $thu_cac_tag ); ?></span><?php endforeach; ?></div>
				<?php endif; ?>
				<div class="detail__actions">
					<?php if ( $thu_cac_first ) : ?>
						<a class="button button--primary" href="<?php echo esc_url( storyweb_chapter_url( $thu_cac_post, $thu_cac_first[0]['number'] ) ); ?>"><?php thu_cac_the_icon( 'tram-front', 18 ); ?> Lên tàu · Đọc từ đầu</a>
					<?php endif; ?>
					<?php if ( $thu_cac_continue ) : ?>
						<a class="button button--glass lg lg-glow" href="<?php echo esc_url( $thu_cac_story['url'] ); ?>" data-continue="<?php echo esc_attr( $thu_cac_continue ); ?>" data-slug="<?php echo esc_attr( $thu_cac_story['slug'] ); ?>" data-old-slugs="<?php echo esc_attr( $thu_cac_old_slugs ); ?>" data-max="<?php echo (int) $thu_cac_story['chapters']; ?>" hidden><?php thu_cac_the_icon( 'play-circle', 18 ); ?> Đọc tiếp chương <span data-continue-number></span></a>
					<?php endif; ?>
					<button type="button" class="button button--glass lg lg-glow" data-bookshelf-toggle data-slug="<?php echo esc_attr( $thu_cac_story['slug'] ); ?>" aria-pressed="false">
						<span class="bookshelf-icon bookshelf-icon--add"><?php thu_cac_the_icon( 'bookmark', 18 ); ?></span>
						<span class="bookshelf-icon bookshelf-icon--saved"><?php thu_cac_the_icon( 'bookmark-check', 18 ); ?></span>
						<span data-bookshelf-label>Thêm vào tủ truyện</span>
					</button>
				</div>
				<?php if ( $thu_cac_story['updated'] ) : ?>
					<p class="detail__updated"><?php thu_cac_the_icon( 'clock3', 15 ); ?> Cập nhật: <?php echo esc_html( $thu_cac_story['updated'] ); ?></p>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>

<?php thu_cac_ad_slot( 'story_detail' ); ?>

<section class="section" id="danh-sach-chuong">
	<div class="container detail__bottom<?php echo $thu_cac_related ? '' : ' detail__bottom--solo'; ?>">
		<div class="route-panel lg">
			<div class="section-head section-head--compact">
				<div><span class="eyebrow"><i></i> Lộ trình</span><h2 class="section-title">Danh sách <em>chương</em></h2></div>
				<span class="route-panel__count"><?php echo (int) $thu_cac_story['chapters']; ?> chương · <?php echo (int) $thu_cac_story['free_chapters']; ?> chương miễn phí</span>
			</div>
			<?php if ( $thu_cac_rows ) : ?>
				<ol class="route" style="--line:<?php echo esc_attr( $thu_cac_line['color'] ); ?>">
					<?php foreach ( $thu_cac_rows as $thu_cac_row ) : ?>
						<?php $thu_cac_locked = $thu_cac_row['number'] > $thu_cac_story['free_chapters']; ?>
						<li>
							<a href="<?php echo esc_url( storyweb_chapter_url( $thu_cac_post, $thu_cac_row['number'] ) ); ?>" class="stop<?php echo $thu_cac_locked ? ' is-locked' : ''; ?>">
								<span class="stop__dot" aria-hidden="true"></span>
								<span class="stop__index"><?php echo esc_html( str_pad( (string) $thu_cac_row['number'], 2, '0', STR_PAD_LEFT ) ); ?></span>
								<span class="stop__name"><?php echo esc_html( $thu_cac_row['title'] ); ?></span>
								<span class="stop__status"><?php echo $thu_cac_locked ? thu_cac_icon( 'lock-keyhole', 13 ) . ' Khóa' : 'Miễn phí'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed icon markup. ?></span>
							</a>
						</li>
					<?php endforeach; ?>
				</ol>
				<?php if ( $thu_cac_pages > 1 ) : ?>
					<nav class="pager" aria-label="Trang danh sách chương">
						<?php
						echo wp_kses_post(
							paginate_links(
								array(
									'base'      => add_query_arg( 'trang-chuong', '%#%', get_permalink( $thu_cac_post ) ) . '#danh-sach-chuong',
									'format'    => '',
									'current'   => $thu_cac_page,
									'total'     => $thu_cac_pages,
									'prev_text' => '‹ Trước',
									'next_text' => 'Sau ›',
								)
							)
						);
						?>
					</nav>
				<?php endif; ?>
			<?php else : ?>
				<p class="empty-note">Truyện chưa có chương nào được xuất bản.</p>
			<?php endif; ?>
		</div>
		<?php if ( $thu_cac_related ) : ?>
			<aside class="aside-card lg" aria-labelledby="cung-tuyen">
				<span class="eyebrow"><i></i> Cùng tuyến</span>
				<h2 id="cung-tuyen" class="aside-card__title">Chuyến tàu cùng cảm hứng</h2>
				<?php foreach ( $thu_cac_related as $thu_cac_rel ) : ?>
					<?php $thu_cac_rel = thu_cac_story( $thu_cac_rel ); ?>
					<a class="aside-card__item" href="<?php echo esc_url( $thu_cac_rel['url'] ); ?>"><?php thu_cac_cover( $thu_cac_rel, 'aside-cover', array( 'decorative' => true, 'sizes' => '52px' ) ); ?><span><strong><?php echo esc_html( $thu_cac_rel['title'] ); ?></strong><small><?php echo esc_html( $thu_cac_rel['author'] ? $thu_cac_rel['author'] : $thu_cac_rel['status'] ); ?> · <?php echo (int) $thu_cac_rel['chapters']; ?> chương</small></span><?php thu_cac_the_icon( 'arrow-right', 16 ); ?></a>
				<?php endforeach; ?>
			</aside>
		<?php endif; ?>
	</div>
</section>
<?php
get_footer();
