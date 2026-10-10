<?php
/**
 * Not found: "Lạc tuyến".
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<section class="section page not-found"><div class="container">
	<div class="not-found__card lg" data-refract>
		<span class="not-found__number" aria-hidden="true">4<?php echo thu_cac_logo_mark( 92, 'not-found__mark' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed markup. ?>4</span>
		<span class="eyebrow"><i></i> Lạc tuyến</span>
		<h1>Chuyến tàu này không có trên bản đồ</h1>
		<p>Có thể đường dẫn đã đổi hoặc trang đã về ga. Quay lại sân ga chính và chọn một chuyến khác nhé.</p>
		<div class="not-found__actions">
			<a class="button button--primary" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php thu_cac_the_icon( 'arrow-left', 18 ); ?> Về ga chính</a>
			<a class="button button--glass lg lg-glow" href="<?php echo esc_url( thu_cac_search_url() ); ?>"><?php thu_cac_the_icon( 'compass', 18 ); ?> Khám phá truyện</a>
		</div>
	</div>
</div></section>
<?php
get_footer();
