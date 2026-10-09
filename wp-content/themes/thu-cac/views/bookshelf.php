<?php
/**
 * Bookshelf (port of app/tu-truyen/page.tsx + bookshelf-list.tsx). Saved slugs live in the visitor's browser
 * (localStorage "storyweb:bookshelf", same key as the Next.js app); site.js loads the cards from
 * /wp-json/thu-cac/v1/cards.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<section class="section section--cream bookshelf-page"><div class="container">
	<div class="page-heading"><div class="eyebrow">GÓC NHỎ CỦA RIÊNG BẠN</div><h1>Tủ truyện <em>của tôi</em></h1><p>Những câu chuyện bạn muốn quay lại, bất cứ lúc nào.</p></div>
	<div data-bookshelf data-cards-api="<?php echo esc_url( rest_url( 'thu-cac/v1/cards' ) ); ?>">
		<div class="story-grid" data-bookshelf-grid hidden></div>
		<div class="empty-state" data-bookshelf-empty>
			<?php thu_cac_the_icon( 'book-open', 40, array( 'stroke-width' => '1.2' ) ); ?>
			<h2>Tủ truyện đang chờ câu chuyện đầu tiên</h2>
			<p>Nhấn “Thêm vào tủ truyện” trên trang truyện để lưu lại những tác phẩm bạn yêu thích.</p>
			<a class="button button--primary" href="<?php echo esc_url( thu_cac_search_url() ); ?>">Khám phá truyện <?php thu_cac_the_icon( 'arrow-right', 18 ); ?></a>
		</div>
	</div>
</div></section>
<?php
get_footer();
