<?php
/**
 * Discover / search ("Bản đồ tuyến"). The main query is the paginated story search set up in inc/views.php;
 * taxonomy-the_loai.php reuses this view for /the-loai/<slug>/.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();

global $wp_query;
$thu_cac_text   = thu_cac_search_text();
$thu_cac_genre  = is_tax( 'the_loai' ) ? get_queried_object() : thu_cac_search_genre();
$thu_cac_genres = thu_cac_genres();
$thu_cac_total  = (int) $wp_query->found_posts;
$thu_cac_chip   = static function ( $term ) use ( $thu_cac_text ) {
	return thu_cac_search_url(
		array(
			'q'        => $thu_cac_text,
			'the-loai' => $term ? $term->slug : '',
		)
	);
};
if ( $thu_cac_text ) {
	$thu_cac_heading = sprintf( 'Kết quả cho “%s”', $thu_cac_text );
} elseif ( $thu_cac_genre ) {
	$thu_cac_heading = 'Truyện ' . $thu_cac_genre->name;
} else {
	$thu_cac_heading = 'Tất cả câu chuyện';
}
?>
<section class="section page discover-page"><div class="container">
	<div class="page-head"><span class="eyebrow"><i></i> Bản đồ tuyến</span><h1 class="page-title">Khám phá <em>truyện hay</em></h1><p>Một câu chuyện hợp với tâm trạng của bạn luôn đang chờ ở sân ga nào đó.</p></div>
	<form class="search-pill search-pill--page lg" data-refract action="<?php echo esc_url( thu_cac_search_url() ); ?>" method="get" role="search">
		<?php thu_cac_the_icon( 'search', 20 ); ?>
		<input type="search" name="q" placeholder="Tìm tên truyện, tác giả, thể loại..." value="<?php echo esc_attr( $thu_cac_text ); ?>" aria-label="Tìm truyện" maxlength="100">
		<?php if ( $thu_cac_genre ) : ?><input type="hidden" name="the-loai" value="<?php echo esc_attr( $thu_cac_genre->slug ); ?>"><?php endif; ?>
		<button class="button button--primary" type="submit">Tìm kiếm</button>
	</form>
	<div class="filter-row">
		<span class="filter-row__label"><?php thu_cac_the_icon( 'route', 17 ); ?> Tuyến</span>
		<div class="filter-row__chips">
			<a class="filter-chip lg<?php echo $thu_cac_genre ? '' : ' is-selected'; ?>" href="<?php echo esc_url( $thu_cac_chip( null ) ); ?>"<?php echo $thu_cac_genre ? '' : ' aria-current="page"'; ?>>Tất cả</a>
			<?php foreach ( $thu_cac_genres as $thu_cac_term ) : ?>
				<?php
				$thu_cac_on = $thu_cac_genre && $thu_cac_genre->term_id === $thu_cac_term->term_id;
				$thu_cac_ln = thu_cac_line( $thu_cac_term->name );
				?>
				<a class="filter-chip lg<?php echo $thu_cac_on ? ' is-selected' : ''; ?>" style="--line:<?php echo esc_attr( $thu_cac_ln['color'] ); ?>" href="<?php echo esc_url( $thu_cac_chip( $thu_cac_term ) ); ?>"<?php echo $thu_cac_on ? ' aria-current="page"' : ''; ?>><span class="filter-chip__code"><?php echo esc_html( $thu_cac_ln['code'] ); ?></span><?php echo esc_html( $thu_cac_term->name ); ?></a>
			<?php endforeach; ?>
		</div>
	</div>
	<?php
	if ( $thu_cac_total > 0 ) {
		thu_cac_ad_slot( 'search_results' );
	}
	?>
	<div class="result-heading"><h2><?php echo esc_html( $thu_cac_heading ); ?></h2><span class="chip lg"><?php echo esc_html( number_format_i18n( $thu_cac_total ) ); ?> truyện</span></div>
	<?php if ( have_posts() ) : ?>
		<div class="story-grid">
			<?php
			while ( have_posts() ) {
				the_post();
				thu_cac_story_card( thu_cac_story( get_post() ) );
			}
			?>
		</div>
		<?php if ( $wp_query->max_num_pages > 1 ) : ?>
			<nav class="pager" aria-label="Trang kết quả">
				<?php
				echo wp_kses_post(
					paginate_links(
						array(
							'base'      => is_tax() ? str_replace( 999999999, '%#%', esc_url( get_pagenum_link( 999999999 ) ) ) : home_url( user_trailingslashit( 'tim-kiem/page/%#%' ) ),
							'format'    => '',
							'current'   => max( 1, get_query_var( 'paged' ) ),
							'total'     => $wp_query->max_num_pages,
							'add_args'  => array_filter(
								array(
									'q'        => $thu_cac_text,
									'the-loai' => ( $thu_cac_genre && ! is_tax() ) ? $thu_cac_genre->slug : '',
								)
							),
							'prev_text' => '‹ Trước',
							'next_text' => 'Sau ›',
						)
					)
				);
				?>
			</nav>
		<?php endif; ?>
	<?php else : ?>
		<div class="empty-state lg"><?php thu_cac_the_icon( 'search-x', 38 ); ?><h2>Chưa có chuyến tàu nào khớp</h2><p>Thử một từ khóa hoặc tuyến thể loại khác nhé.</p><a href="<?php echo esc_url( thu_cac_search_url() ); ?>" class="button button--primary">Xem tất cả truyện</a></div>
	<?php endif; ?>
</div></section>
<?php
get_footer();
