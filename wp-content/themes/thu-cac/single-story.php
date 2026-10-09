<?php
/**
 * Story detail (port of app/truyen/[slug]/page.tsx). Chapter list is paginated (100 per page) so stories with
 * thousands of chapters stay light.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();

$thu_cac_post  = get_queried_object();
$thu_cac_story = thu_cac_story( $thu_cac_post );
$thu_cac_per   = 100;
// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- public read-only pager.
$thu_cac_page  = isset( $_GET['trang-chuong'] ) ? max( 1, absint( $_GET['trang-chuong'] ) ) : 1;
$thu_cac_rows  = function_exists( 'storyweb_story_chapters' ) ? storyweb_story_chapters( $thu_cac_post->ID, $thu_cac_per, ( $thu_cac_page - 1 ) * $thu_cac_per ) : array();
$thu_cac_pages = max( 1, (int) ceil( $thu_cac_story['chapters'] / $thu_cac_per ) );
$thu_cac_first = function_exists( 'storyweb_story_chapters' ) ? storyweb_story_chapters( $thu_cac_post->ID, 1 ) : array();
$thu_cac_related = $thu_cac_story['genre_slug'] ? thu_cac_stories(
	array(
		'posts_per_page' => 3,
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
?>
<section class="detail-hero"><div class="container">
	<div class="breadcrumbs"><a href="<?php echo esc_url( home_url( '/' ) ); ?>">Trang chủ</a><span>/</span><a href="<?php echo esc_url( thu_cac_search_url() ); ?>">Khám phá</a><span>/</span><span><?php echo esc_html( $thu_cac_story['title'] ); ?></span></div>
	<div class="detail-grid">
		<?php thu_cac_cover( $thu_cac_story, 'detail-cover' ); ?>
		<div class="detail-copy">
			<div class="eyebrow"><?php echo esc_html( $thu_cac_story['genre'] . ' · ' . $thu_cac_story['status'] ); ?></div>
			<h1><?php echo esc_html( $thu_cac_story['title'] ); ?></h1>
			<p class="detail-author">Tác giả <strong><?php echo esc_html( $thu_cac_story['author'] ); ?></strong></p>
			<div class="detail-metrics">
				<span><?php thu_cac_the_icon( 'star', 17, array( 'fill' => 'currentColor' ) ); ?> <strong><?php echo esc_html( $thu_cac_story['rating'] ); ?></strong> đánh giá</span>
				<span><?php thu_cac_the_icon( 'eye', 18 ); ?> <?php echo esc_html( $thu_cac_story['reads'] ); ?> lượt đọc</span>
				<span><?php thu_cac_the_icon( 'book-open', 18 ); ?> <?php echo (int) $thu_cac_story['chapters']; ?> chương</span>
			</div>
			<div class="detail-blurb"><?php echo wp_kses_post( wpautop( $thu_cac_post->post_content ? $thu_cac_post->post_content : $thu_cac_story['blurb'] ) ); ?></div>
			<?php if ( $thu_cac_story['tags'] ) : ?>
				<div class="tag-list"><?php foreach ( $thu_cac_story['tags'] as $thu_cac_tag ) : ?><span><?php echo esc_html( $thu_cac_tag ); ?></span><?php endforeach; ?></div>
			<?php endif; ?>
			<div class="detail-actions">
				<?php if ( $thu_cac_first ) : ?>
					<a class="button button--primary" href="<?php echo esc_url( storyweb_chapter_url( $thu_cac_post, $thu_cac_first[0]['number'] ) ); ?>">Đọc từ đầu <?php thu_cac_the_icon( 'arrow-right', 18 ); ?></a>
				<?php endif; ?>
				<button type="button" class="button button--outline" data-bookshelf-toggle data-slug="<?php echo esc_attr( $thu_cac_story['slug'] ); ?>" aria-pressed="false">
					<span class="bookshelf-icon bookshelf-icon--add"><?php thu_cac_the_icon( 'bookmark', 18 ); ?></span>
					<span class="bookshelf-icon bookshelf-icon--saved"><?php thu_cac_the_icon( 'bookmark-check', 18 ); ?></span>
					<span data-bookshelf-label>Thêm vào tủ truyện</span>
				</button>
			</div>
			<?php if ( $thu_cac_story['updated'] ) : ?>
				<div class="detail-updated"><?php thu_cac_the_icon( 'clock3', 15 ); ?> Cập nhật: <?php echo esc_html( $thu_cac_story['updated'] ); ?></div>
			<?php endif; ?>
		</div>
	</div>
</div></section>

<?php thu_cac_ad_slot( 'story_detail' ); ?>

<section class="section section--cream" id="danh-sach-chuong"><div class="container detail-bottom">
	<div>
		<div class="section-heading section-heading--compact"><div><div class="eyebrow">LẬT MỞ TỪNG TRANG</div><h2>Danh sách <em>chương</em></h2></div><span><?php echo (int) $thu_cac_story['chapters']; ?> chương · <?php echo (int) $thu_cac_story['free_chapters']; ?> chương miễn phí</span></div>
		<?php if ( $thu_cac_rows ) : ?>
			<div class="chapter-list">
				<?php foreach ( $thu_cac_rows as $thu_cac_row ) : ?>
					<?php $thu_cac_locked = $thu_cac_row['number'] > $thu_cac_story['free_chapters']; ?>
					<a href="<?php echo esc_url( storyweb_chapter_url( $thu_cac_post, $thu_cac_row['number'] ) ); ?>" class="chapter-row">
						<span class="chapter-row__index"><?php echo esc_html( str_pad( (string) $thu_cac_row['number'], 2, '0', STR_PAD_LEFT ) ); ?></span>
						<span class="chapter-row__name"><?php echo esc_html( $thu_cac_row['title'] ); ?></span>
						<span class="chapter-row__status<?php echo $thu_cac_locked ? ' chapter-row__status--locked' : ''; ?>"><?php echo $thu_cac_locked ? thu_cac_icon( 'lock-keyhole', 14 ) . ' Khóa' : 'Miễn phí'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed icon markup. ?></span>
						<?php thu_cac_the_icon( 'arrow-right', 17 ); ?>
					</a>
				<?php endforeach; ?>
			</div>
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
		<aside class="detail-aside"><div class="aside-card"><span class="eyebrow">GỢI Ý TIẾP THEO</span><h3>Những câu chuyện cùng cảm hứng</h3>
			<?php foreach ( $thu_cac_related as $thu_cac_rel ) : ?>
				<?php $thu_cac_rel = thu_cac_story( $thu_cac_rel ); ?>
				<a href="<?php echo esc_url( $thu_cac_rel['url'] ); ?>"><?php thu_cac_cover( $thu_cac_rel, 'aside-cover' ); ?><span><strong><?php echo esc_html( $thu_cac_rel['title'] ); ?></strong><small><?php echo esc_html( $thu_cac_rel['author'] ); ?></small></span><?php thu_cac_the_icon( 'arrow-right', 16 ); ?></a>
			<?php endforeach; ?>
		</div></aside>
	<?php endif; ?>
</div></section>
<?php
get_footer();
