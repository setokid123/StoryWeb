<?php
/**
 * Bookshelf ("Tủ truyện"). Saved slugs live in the visitor's browser (localStorage "storyweb:bookshelf", same key
 * as the Next.js app); site.js loads the cards from /wp-json/thu-cac/v1/cards.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<section class="section page bookshelf-page"><div class="container">
	<div class="page-head"><span class="eyebrow"><i></i> Hộc vé của bạn</span><h1 class="page-title">Tủ truyện <em>của tôi</em></h1><p>Những chuyến tàu bạn muốn quay lại, lưu ngay trên máy này.</p></div>
	<div data-bookshelf data-cards-api="<?php echo esc_url( rest_url( 'thu-cac/v1/cards' ) ); ?>">
		<div class="story-grid" data-bookshelf-grid hidden></div>
		<div class="empty-state lg" data-bookshelf-empty>
			<?php thu_cac_the_icon( 'ticket', 40, array( 'stroke-width' => '1.4' ) ); ?>
			<h2>Hộc vé đang trống</h2>
			<p>Nhấn “Thêm vào tủ truyện” trên trang truyện để giữ chỗ cho những chuyến tàu bạn yêu thích.</p>
			<a class="button button--primary" href="<?php echo esc_url( thu_cac_search_url() ); ?>">Khám phá truyện <?php thu_cac_the_icon( 'arrow-right', 18 ); ?></a>
		</div>
	</div>
</div></section>
<?php
get_footer();
