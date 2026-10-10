<?php
/**
 * "Xem nhiều" page (/xem-nhieu/, ?ky=ngay|tuan|thang|tat-ca): the 50 most viewed stories of a period.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<section class="section page ranking-page"><div class="container">
	<div class="page-head"><span class="eyebrow"><i></i> Bảng xếp hạng</span><h1 class="page-title">Truyện <em>xem nhiều</em></h1><p>Những chuyến tàu đông khách nhất ở sân ga, tính cả trang truyện và mọi chương.</p></div>
	<?php if ( thu_cac_ranking_available() ) : ?>
		<?php
		get_template_part(
			'template-parts/ranking',
			null,
			array(
				'limit'   => 50,
				'mode'    => 'page',
				'period'  => thu_cac_ranking_current_period(),
				'heading' => false,
				'more'    => false,
			)
		);
		?>
	<?php else : ?>
		<div class="empty-state lg"><?php thu_cac_the_icon( 'eye', 40, array( 'stroke-width' => '1.4' ) ); ?><h2>Chưa đếm lượt xem</h2><p>Bảng xếp hạng cần plugin Post Views Counter.</p></div>
	<?php endif; ?>
</div></section>
<?php
get_footer();
