<?php
/**
 * "Xem nhiều" board: period tabs and the ranked stories (rank, cover, title, genre, views).
 * $args: limit (int), mode 'tabs' (home: every period rendered, site.js switches them) or 'page' (/xem-nhieu/: one
 * period, the tabs are links), period (initial / current), heading (bool), more (bool: link to the full page).
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

$thu_cac_args    = wp_parse_args(
	$args,
	array(
		'limit'   => 10,
		'mode'    => 'tabs',
		'period'  => 'tuan',
		'heading' => true,
		'more'    => true,
	)
);
$thu_cac_periods = thu_cac_ranking_periods();
$thu_cac_lists   = array();
foreach ( $thu_cac_periods as $thu_cac_key => $thu_cac_label ) {
	if ( 'tabs' === $thu_cac_args['mode'] || $thu_cac_key === $thu_cac_args['period'] ) {
		$thu_cac_lists[ $thu_cac_key ] = thu_cac_most_viewed( $thu_cac_key, $thu_cac_args['limit'] );
	}
}
$thu_cac_active = $thu_cac_args['period'];
?>
<div class="ranking lg" data-ranking>
	<header class="ranking__head">
		<?php if ( $thu_cac_args['heading'] ) : ?>
			<div><span class="eyebrow"><i></i> Xem nhiều</span><h2 class="section-title">Toa <em>đông khách nhất</em></h2></div>
		<?php endif; ?>
		<div class="ranking__tabs" role="tablist" aria-label="Khoảng thời gian">
			<?php foreach ( $thu_cac_periods as $thu_cac_key => $thu_cac_label ) : ?>
				<?php $thu_cac_on = $thu_cac_key === $thu_cac_active; ?>
				<?php if ( 'page' === $thu_cac_args['mode'] ) : ?>
					<a class="ranking__tab<?php echo $thu_cac_on ? ' is-active' : ''; ?>" href="<?php echo esc_url( thu_cac_ranking_url( $thu_cac_key ) ); ?>"<?php echo $thu_cac_on ? ' aria-current="page"' : ''; ?>><?php echo esc_html( $thu_cac_label ); ?></a>
				<?php else : ?>
					<button type="button" class="ranking__tab<?php echo $thu_cac_on ? ' is-active' : ''; ?>" role="tab" aria-selected="<?php echo $thu_cac_on ? 'true' : 'false'; ?>" data-ranking-tab="<?php echo esc_attr( $thu_cac_key ); ?>"><?php echo esc_html( $thu_cac_label ); ?></button>
				<?php endif; ?>
			<?php endforeach; ?>
		</div>
	</header>
	<?php foreach ( $thu_cac_lists as $thu_cac_key => $thu_cac_rows ) : ?>
		<div class="ranking__panel" role="tabpanel" data-ranking-panel="<?php echo esc_attr( $thu_cac_key ); ?>"<?php echo $thu_cac_key === $thu_cac_active ? '' : ' hidden'; ?>>
			<?php if ( $thu_cac_rows ) : ?>
				<ol class="ranking__list<?php echo count( $thu_cac_rows ) > 5 ? ' is-two-cols' : ''; ?>" style="--rows:<?php echo (int) ceil( count( $thu_cac_rows ) / 2 ); ?>">
					<?php foreach ( $thu_cac_rows as $thu_cac_i => $thu_cac_row ) : ?>
						<?php $thu_cac_story = thu_cac_story( $thu_cac_row['id'] ); ?>
						<li>
							<a class="rank-row" href="<?php echo esc_url( $thu_cac_story['url'] ); ?>">
								<span class="rank-row__no<?php echo $thu_cac_i < 3 ? ' is-top is-top-' . ( (int) $thu_cac_i + 1 ) : ''; ?>"><?php echo (int) $thu_cac_i + 1; ?></span>
								<?php thu_cac_cover( $thu_cac_story, 'rank-row__cover', array( 'sizes' => '48px' ) ); ?>
								<span class="rank-row__text">
									<strong><?php echo esc_html( $thu_cac_story['title'] ); ?></strong>
									<small><?php echo esc_html( $thu_cac_story['genre'] ); ?> · <?php echo (int) $thu_cac_story['chapters']; ?> chương · <?php echo esc_html( $thu_cac_story['status'] ); ?></small>
								</span>
								<span class="rank-row__views" title="<?php echo esc_attr( number_format_i18n( $thu_cac_row['views'] ) . ' lượt xem' ); ?>"><?php thu_cac_the_icon( 'eye', 15 ); ?><b><?php echo esc_html( thu_cac_compact_number( $thu_cac_row['views'] ) ); ?></b></span>
							</a>
						</li>
					<?php endforeach; ?>
				</ol>
			<?php else : ?>
				<p class="ranking__empty"><?php echo esc_html( 'ngay' === $thu_cac_key ? 'Hôm nay chưa có lượt xem nào. Ghé lại sau nhé!' : 'Chưa có lượt xem trong khoảng này.' ); ?></p>
			<?php endif; ?>
		</div>
	<?php endforeach; ?>
	<?php if ( $thu_cac_args['more'] ) : ?>
		<footer class="ranking__foot"><a class="link-arrow" href="<?php echo esc_url( thu_cac_ranking_url() ); ?>">Xem bảng xếp hạng đầy đủ <?php thu_cac_the_icon( 'arrow-right', 17 ); ?></a></footer>
	<?php endif; ?>
</div>
