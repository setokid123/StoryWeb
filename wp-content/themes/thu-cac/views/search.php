<?php
/**
 * Discover / search (port of app/tim-kiem/page.tsx). The main query is the paginated story search set up in
 * inc/views.php; taxonomy-the_loai.php reuses this view for /the-loai/<slug>/.
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
<section class="section section--cream discover-page"><div class="container">
	<div class="page-heading"><div class="eyebrow">THƯ VIỆN CỦA BẠN</div><h1>Khám phá <em>truyện hay</em></h1><p>Một câu chuyện phù hợp luôn ở đâu đó trên kệ sách.</p></div>
	<form class="search-form" action="<?php echo esc_url( thu_cac_search_url() ); ?>" method="get" role="search">
		<?php thu_cac_the_icon( 'search', 21 ); ?>
		<input type="search" name="q" placeholder="Tìm tên truyện, tác giả, thể loại..." value="<?php echo esc_attr( $thu_cac_text ); ?>" aria-label="Tìm truyện" maxlength="100">
		<?php if ( $thu_cac_genre ) : ?><input type="hidden" name="the-loai" value="<?php echo esc_attr( $thu_cac_genre->slug ); ?>"><?php endif; ?>
		<button type="submit">Tìm kiếm <span>→</span></button>
	</form>
	<div class="filter-row">
		<span><?php thu_cac_the_icon( 'sliders-horizontal', 17 ); ?> Thể loại</span>
		<div>
			<a class="filter-chip<?php echo $thu_cac_genre ? '' : ' is-selected'; ?>" href="<?php echo esc_url( $thu_cac_chip( null ) ); ?>">Tất cả</a>
			<?php foreach ( $thu_cac_genres as $thu_cac_term ) : ?>
				<a class="filter-chip<?php echo ( $thu_cac_genre && $thu_cac_genre->term_id === $thu_cac_term->term_id ) ? ' is-selected' : ''; ?>" href="<?php echo esc_url( $thu_cac_chip( $thu_cac_term ) ); ?>"><?php echo esc_html( $thu_cac_term->name ); ?></a>
			<?php endforeach; ?>
		</div>
	</div>
	<?php
	if ( $thu_cac_total > 0 ) {
		thu_cac_ad_slot( 'search_results' );
	}
	?>
	<div class="result-heading"><h2><?php echo esc_html( $thu_cac_heading ); ?></h2><span><?php echo (int) $thu_cac_total; ?> truyện</span></div>
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
		<div class="empty-state"><?php thu_cac_the_icon( 'search', 38 ); ?><h2>Chưa tìm thấy câu chuyện phù hợp</h2><p>Thử một từ khóa hoặc thể loại khác nhé.</p><a href="<?php echo esc_url( thu_cac_search_url() ); ?>" class="button button--primary">Xem tất cả truyện</a></div>
	<?php endif; ?>
</div></section>
<?php
get_footer();
