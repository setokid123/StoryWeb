<?php
/**
 * wp-admin → Truyện → Thống kê: reading (Post Views Counter) and the unlock flow (inc/stats.php) for today or the
 * last 7, 30 or 90 days, as figures, daily charts and tables. Plus a "Hôm nay" box on the wp-admin dashboard.
 * Administrators only. Charts are plain SVG, no script.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

const STORYWEB_STATS_RANGES = array(
	1  => 'Hôm nay',
	7  => '7 ngày',
	30 => '30 ngày',
	90 => '90 ngày',
);

add_action(
	'admin_menu',
	static function () {
		add_submenu_page( 'edit.php?post_type=story', 'Thống kê', 'Thống kê', 'manage_options', 'storyweb-stats', 'storyweb_stats_admin_page' );
	}
);

/** Why /mo-khoa/ turned a request down, in the admin's words. */
function storyweb_stats_refusal_label( $reason ) {
	$labels = array(
		'invalid'   => 'Link cũ hoặc sai (trang đọc để quá lâu rồi mới bấm, hoặc link bị chép đi nơi khác)',
		'not_click' => 'Không phải cú bấm trên trang đọc (bot, hoặc mở thẳng link /mo-khoa/)',
		'rate'      => 'Một mạng bấm quá 15 lần trong một giờ',
	);
	return $labels[ $reason ] ?? $reason;
}

function storyweb_stats_number( $n ) {
	return number_format_i18n( (int) $n );
}

/** "12,5%" or "–" when there is nothing to divide by. */
function storyweb_stats_percent( $part, $whole ) {
	return $whole > 0 ? number_format_i18n( 100 * $part / $whole, 1 ) . '%' : '–';
}

/** A story's title linked to its page, or a note when it is gone. */
function storyweb_stats_story_link( $story_id ) {
	$story = $story_id ? get_post( (int) $story_id ) : null;
	if ( ! $story || 'story' !== $story->post_type ) {
		return '<span class="sw-stats__muted">' . esc_html( $story_id ? 'Truyện đã xóa' : 'Không rõ truyện' ) . '</span>';
	}
	return '<a href="' . esc_url( get_permalink( $story ) ) . '" target="_blank" rel="noopener">' . esc_html( get_the_title( $story ) ) . '</a>';
}

/**
 * Daily bar chart in SVG. $series: label => array( day => value ), drawn stacked (reading) or side by side
 * (unlock). Each bar has a tooltip; the chart is described for screen readers by $summary.
 */
function storyweb_stats_chart( $days, $series, $colors, $summary, $stacked ) {
	$n     = count( $days );
	$slot  = max( 8, (int) floor( 720 / max( 1, $n ) ) );
	$w     = $n * $slot;
	$h     = 170;
	$base  = 150;
	$max   = 1;
	$names = array_keys( $series );
	foreach ( $days as $day ) {
		$values = array();
		foreach ( $names as $name ) {
			$values[] = (int) ( $series[ $name ][ $day ] ?? 0 );
		}
		$max = max( $max, $stacked ? array_sum( $values ) : max( $values ) );
	}
	$scale = 130 / $max;
	$every = (int) ceil( $n / 10 );
	$out   = '<svg class="sw-stats__chart" viewBox="0 0 ' . (int) $w . ' ' . (int) $h . '" role="img" aria-label="' . esc_attr( $summary ) . '">';
	$out  .= '<line x1="0" x2="' . (int) $w . '" y1="' . (int) $base . '" y2="' . (int) $base . '" class="sw-stats__axis"/>';
	$out  .= '<text x="2" y="12" class="sw-stats__tick">' . esc_html( storyweb_stats_number( $max ) ) . '</text>';
	foreach ( $days as $i => $day ) {
		$x     = $i * $slot;
		$label = gmdate( 'd/m', strtotime( $day . ' 00:00:00 UTC' ) );
		$tip   = array();
		$y     = $base;
		foreach ( $names as $k => $name ) {
			$value = (int) ( $series[ $name ][ $day ] ?? 0 );
			$tip[] = $name . ': ' . storyweb_stats_number( $value );
			$bar_h = $value * $scale;
			if ( $stacked ) {
				$bar_w = $slot * 0.7;
				$bar_x = $x + $slot * 0.15;
				$y    -= $bar_h;
				$bar_y = $y;
			} else {
				$bar_w = $slot * 0.7 / count( $names );
				$bar_x = $x + $slot * 0.15 + $k * $bar_w;
				$bar_y = $base - $bar_h;
			}
			if ( $value > 0 ) {
				$out .= sprintf( '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="1.5" fill="%s"/>', $bar_x, $bar_y, $bar_w, max( 1, $bar_h ), esc_attr( $colors[ $k ] ) );
			}
		}
		// One invisible column per day carries the tooltip, so it shows anywhere over the day.
		$out .= sprintf( '<rect x="%d" y="0" width="%d" height="%d" fill="transparent"><title>%s</title></rect>', $x, $slot, $base, esc_html( $label . ' · ' . implode( ' · ', $tip ) ) );
		if ( 0 === ( $n - 1 - $i ) % $every ) {
			$out .= sprintf( '<text x="%.1f" y="166" text-anchor="middle" class="sw-stats__tick">%s</text>', $x + $slot / 2, esc_html( $label ) );
		}
	}
	$out .= '</svg><p class="sw-stats__legend">';
	foreach ( $names as $k => $name ) {
		$out .= '<span><i style="background:' . esc_attr( $colors[ $k ] ) . '"></i>' . esc_html( $name ) . '</span>';
	}
	return $out . '</p>';
}

add_action(
	'admin_head',
	static function () {
		$screen = get_current_screen();
		if ( ! $screen || ! in_array( $screen->id, array( 'story_page_storyweb-stats', 'dashboard' ), true ) ) {
			return;
		}
		?>
<style>
.sw-stats { max-width: 1200px; }
.sw-stats__ranges { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 6px; }
.sw-stats__ranges .button[aria-current] { background: #2271b1; border-color: #2271b1; color: #fff; }
.sw-stats__note, .sw-stats__muted { color: #646970; }
.sw-stats__cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 16px 0; }
.sw-stats__card, .sw-stats__panel { background: #fff; border: 1px solid #dcdcde; border-radius: 8px; padding: 16px 18px; }
.sw-stats__card b { display: block; margin: 4px 0 2px; font-size: 28px; line-height: 1.2; font-variant-numeric: tabular-nums; }
.sw-stats__card span { color: #50575e; }
.sw-stats__card small { display: block; margin-top: 4px; color: #646970; }
.sw-stats__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 12px; margin-bottom: 12px; }
.sw-stats__panel h2 { margin: 0 0 4px; font-size: 15px; }
.sw-stats__panel > p { margin: 0 0 12px; }
.sw-stats__chart { display: block; width: 100%; height: auto; margin-top: 8px; }
.sw-stats__axis { stroke: #c3c4c7; stroke-width: 1; }
.sw-stats__tick { font-size: 10px; fill: #646970; font-variant-numeric: tabular-nums; }
.sw-stats__legend { display: flex; gap: 16px; margin: 8px 0 0; color: #50575e; }
.sw-stats__legend i { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; vertical-align: -1px; }
.sw-stats table { margin-top: 4px; }
.sw-stats td.num, .sw-stats th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sw-stats td.link { word-break: break-all; }
.sw-stats-widget ul { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0 0 10px; }
.sw-stats-widget li b { display: block; font-size: 22px; line-height: 1.3; font-variant-numeric: tabular-nums; }
.sw-stats-widget li span { color: #646970; }
@media (max-width: 782px) { .sw-stats__grid { grid-template-columns: 1fr; } }
</style>
		<?php
	}
);

function storyweb_stats_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- a read-only view choice.
	$days = isset( $_GET['khoang'] ) ? absint( $_GET['khoang'] ) : 30;
	$days = array_key_exists( $days, STORYWEB_STATS_RANGES ) ? $days : 30;
	$list = storyweb_stats_days( $days );

	$read    = storyweb_stats_reading( $days );
	$unlock  = storyweb_stats_unlock( $days );
	$content = storyweb_stats_content( $days );
	$today   = gmdate( 'Y-m-d' );
	$refused = array_sum( $unlock['items']['refused'] );
	$links   = array_values( storyweb_unlock_settings()['links'] );
	$period  = 1 === $days ? 'hôm nay' : 'trong ' . STORYWEB_STATS_RANGES[ $days ];
	?>
	<div class="wrap sw-stats">
		<h1>Thống kê</h1>
		<nav class="sw-stats__ranges" aria-label="Khoảng thời gian">
			<?php foreach ( STORYWEB_STATS_RANGES as $key => $label ) : ?>
				<a class="button" href="<?php echo esc_url( add_query_arg( 'khoang', $key ) ); ?>"<?php echo $key === $days ? ' aria-current="page"' : ''; ?>><?php echo esc_html( $label ); ?></a>
			<?php endforeach; ?>
		</nav>
		<p class="sw-stats__note">Một ngày tính theo giờ quốc tế (UTC): từ 7:00 sáng hôm nay đến 7:00 sáng hôm sau, giờ Việt Nam. Lượt gặp chương khóa không tính bot, link xem trước và người đã mở khóa.</p>

		<div class="sw-stats__cards">
			<div class="sw-stats__card"><span>Lượt đọc <?php echo esc_html( $period ); ?></span><b><?php echo esc_html( $read['available'] ? storyweb_stats_number( $read['total'] ) : '–' ); ?></b><small><?php echo esc_html( $read['available'] ? 'Hôm nay ' . storyweb_stats_number( $read['daily'][ $today ]['story'] + $read['daily'][ $today ]['chapter'] ) . ' · từ trước tới nay ' . storyweb_stats_number( $read['all_time'] ) : 'Cần bật plugin Post Views Counter' ); ?></small></div>
			<div class="sw-stats__card"><span>Lượt bấm link mở khóa</span><b><?php echo esc_html( storyweb_stats_number( $unlock['click'] ) ); ?></b><small><?php echo esc_html( 'Hôm nay ' . storyweb_stats_number( $unlock['daily'][ $today ]['click'] ) . ' · bị chặn ' . storyweb_stats_number( $refused ) ); ?></small></div>
			<div class="sw-stats__card"><span>Tỉ lệ bấm mở khóa</span><b><?php echo esc_html( storyweb_stats_percent( $unlock['click'], $unlock['gate'] ) ); ?></b><small><?php echo esc_html( storyweb_stats_number( $unlock['gate'] ) . ' lần gặp chương khóa, ' . storyweb_stats_number( $unlock['click'] ) . ' lần bấm link' ); ?></small></div>
			<div class="sw-stats__card"><span>Kho truyện</span><b><?php echo esc_html( storyweb_stats_number( $content['stories'] ) . ' truyện' ); ?></b><small><?php echo esc_html( storyweb_stats_number( $content['chapters'] ) . ' chương · mới ' . $period . ': ' . storyweb_stats_number( $content['new_stories'] ) . ' truyện, ' . storyweb_stats_number( $content['new_chapters'] ) . ' chương' ); ?></small></div>
		</div>

		<?php if ( $days > 1 ) : ?>
		<div class="sw-stats__grid">
			<section class="sw-stats__panel">
				<h2>Lượt đọc mỗi ngày</h2>
				<p class="sw-stats__muted">Rê chuột lên cột để xem số của từng ngày.</p>
				<?php
				if ( $read['available'] ) {
					// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built with esc_* in storyweb_stats_chart().
					echo storyweb_stats_chart(
						$list,
						array(
							'Đọc chương'   => array_map( static fn( $d ) => $d['chapter'], $read['daily'] ),
							'Xem trang truyện' => array_map( static fn( $d ) => $d['story'], $read['daily'] ),
						),
						array( '#2271b1', '#9ec2e6' ),
						sprintf( 'Lượt đọc mỗi ngày %s, tổng %s', $period, storyweb_stats_number( $read['total'] ) ),
						true
					);
				} else {
					echo '<p>Cần bật plugin Post Views Counter để đếm lượt đọc.</p>';
				}
				?>
			</section>
			<section class="sw-stats__panel">
				<h2>Mở khóa mỗi ngày</h2>
				<p class="sw-stats__muted">Số lần người đọc gặp chương khóa và số lần họ bấm link.</p>
				<?php
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built with esc_* in storyweb_stats_chart().
				echo storyweb_stats_chart(
					$list,
					array(
						'Gặp chương khóa' => array_map( static fn( $d ) => $d['gate'], $unlock['daily'] ),
						'Bấm link'        => array_map( static fn( $d ) => $d['click'], $unlock['daily'] ),
					),
					array( '#d7c6f0', '#7b2cbf' ),
					sprintf( 'Mở khóa mỗi ngày %s: %s lần gặp chương khóa, %s lần bấm link', $period, storyweb_stats_number( $unlock['gate'] ), storyweb_stats_number( $unlock['click'] ) ),
					false
				);
				?>
			</section>
		</div>
		<?php endif; ?>

		<div class="sw-stats__grid">
			<section class="sw-stats__panel">
				<h2>Truyện đọc nhiều nhất</h2>
				<p class="sw-stats__muted">Trang truyện cộng tất cả các chương, <?php echo esc_html( $period ); ?>.</p>
				<?php if ( $read['top'] ) : ?>
					<table class="widefat striped">
						<thead><tr><th scope="col">Truyện</th><th scope="col" class="num">Lượt đọc</th><th scope="col" class="num">Trong đó đọc chương</th></tr></thead>
						<tbody>
							<?php foreach ( $read['top'] as $row ) : ?>
								<tr><td><?php echo storyweb_stats_story_link( $row['story_id'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside. ?></td><td class="num"><?php echo esc_html( storyweb_stats_number( $row['hits'] ) ); ?></td><td class="num"><?php echo esc_html( storyweb_stats_number( $row['chapter_hits'] ) ); ?></td></tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php else : ?>
					<p><?php echo esc_html( $read['available'] ? 'Chưa có lượt đọc nào ' . $period . '.' : 'Cần bật plugin Post Views Counter để đếm lượt đọc.' ); ?></p>
				<?php endif; ?>
			</section>

			<section class="sw-stats__panel">
				<h2>Truyện được bấm mở khóa nhiều nhất</h2>
				<p class="sw-stats__muted">Người đọc gặp chương khóa ở truyện nào, và bao nhiêu người bấm link.</p>
				<?php
				// Most clicks first, then most locked-chapter views.
				$stories = array_keys( $unlock['items']['click'] + $unlock['items']['gate'] );
				usort(
					$stories,
					static fn( $a, $b ) => array( $unlock['items']['click'][ $b ] ?? 0, $unlock['items']['gate'][ $b ] ?? 0 ) <=> array( $unlock['items']['click'][ $a ] ?? 0, $unlock['items']['gate'][ $a ] ?? 0 )
				);
				$stories = array_slice( $stories, 0, 10 );
				?>
				<?php if ( $unlock['items']['gate'] || $unlock['items']['click'] ) : ?>
					<table class="widefat striped">
						<thead><tr><th scope="col">Truyện</th><th scope="col" class="num">Gặp chương khóa</th><th scope="col" class="num">Bấm link</th><th scope="col" class="num">Tỉ lệ</th></tr></thead>
						<tbody>
							<?php foreach ( $stories as $story_id ) : ?>
								<?php
								$clicks = (int) ( $unlock['items']['click'][ $story_id ] ?? 0 );
								$gates  = (int) ( $unlock['items']['gate'][ $story_id ] ?? 0 );
								?>
								<tr><td><?php echo storyweb_stats_story_link( $story_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside. ?></td><td class="num"><?php echo esc_html( storyweb_stats_number( $gates ) ); ?></td><td class="num"><?php echo esc_html( storyweb_stats_number( $clicks ) ); ?></td><td class="num"><?php echo esc_html( storyweb_stats_percent( $clicks, $gates ) ); ?></td></tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php else : ?>
					<p>Chưa có ai gặp chương khóa <?php echo esc_html( $period ); ?>. Mở khóa bằng link cần đang bật (Truyện → Mở khóa chương).</p>
				<?php endif; ?>
			</section>

			<section class="sw-stats__panel">
				<h2>Link mở khóa được mở</h2>
				<p class="sw-stats__muted">Mỗi lần bấm, trang chọn ngẫu nhiên 1 trong các link của bạn.</p>
				<?php if ( $unlock['items']['link'] ) : ?>
					<table class="widefat striped">
						<thead><tr><th scope="col">Link</th><th scope="col" class="num">Lượt bấm</th><th scope="col" class="num">Tỉ trọng</th></tr></thead>
						<tbody>
							<?php foreach ( $unlock['items']['link'] as $url => $hits ) : ?>
								<tr>
									<td class="link"><a href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html( $url ); ?></a><?php echo in_array( $url, $links, true ) ? '' : ' <span class="sw-stats__muted">(đã gỡ khỏi danh sách)</span>'; ?></td>
									<td class="num"><?php echo esc_html( storyweb_stats_number( $hits ) ); ?></td>
									<td class="num"><?php echo esc_html( storyweb_stats_percent( $hits, $unlock['click'] ) ); ?></td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php else : ?>
					<p>Chưa có lượt bấm nào <?php echo esc_html( $period ); ?>.</p>
				<?php endif; ?>
			</section>

			<section class="sw-stats__panel">
				<h2>Lượt bị chặn</h2>
				<p class="sw-stats__muted">Yêu cầu mở khóa không được chấp nhận, nên không tính là lượt bấm.</p>
				<?php if ( $unlock['items']['refused'] ) : ?>
					<table class="widefat striped">
						<thead><tr><th scope="col">Lý do</th><th scope="col" class="num">Số lần</th></tr></thead>
						<tbody>
							<?php foreach ( $unlock['items']['refused'] as $reason => $hits ) : ?>
								<tr><td><?php echo esc_html( storyweb_stats_refusal_label( $reason ) ); ?></td><td class="num"><?php echo esc_html( storyweb_stats_number( $hits ) ); ?></td></tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php else : ?>
					<p>Không có lượt nào bị chặn <?php echo esc_html( $period ); ?>.</p>
				<?php endif; ?>
			</section>
		</div>
		<p class="sw-stats__note">Lượt đọc lấy từ plugin Post Views Counter. Lượt mở khóa do StoryWeb Core tự đếm theo ngày, không lưu IP hay thông tin người đọc; số liệu giữ <?php echo (int) STORYWEB_STATS_KEEP_DAYS; ?> ngày.</p>
	</div>
	<?php
}

// wp-admin dashboard: today at a glance.
add_action(
	'wp_dashboard_setup',
	static function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		wp_add_dashboard_widget(
			'storyweb_stats_today',
			'Trạm Truyện 2D hôm nay',
			static function () {
				$today  = gmdate( 'Y-m-d' );
				$read   = storyweb_stats_reading( 1, 1 );
				$unlock = storyweb_stats_unlock( 1 );
				$views  = $read['daily'][ $today ]['story'] + $read['daily'][ $today ]['chapter'];
				?>
				<div class="sw-stats-widget">
					<ul>
						<li><b><?php echo esc_html( $read['available'] ? storyweb_stats_number( $views ) : '–' ); ?></b><span>lượt đọc</span></li>
						<li><b><?php echo esc_html( storyweb_stats_number( $unlock['click'] ) ); ?></b><span>lượt bấm mở khóa</span></li>
						<li><b><?php echo esc_html( storyweb_stats_percent( $unlock['click'], $unlock['gate'] ) ); ?></b><span>tỉ lệ bấm</span></li>
					</ul>
					<a class="button" href="<?php echo esc_url( admin_url( 'edit.php?post_type=story&page=storyweb-stats' ) ); ?>">Xem thống kê</a>
				</div>
				<?php
			}
		);
		// First box on the dashboard (people can still drag it elsewhere).
		global $wp_meta_boxes;
		$core = $wp_meta_boxes['dashboard']['normal']['core'] ?? array();
		if ( isset( $core['storyweb_stats_today'] ) ) {
			$wp_meta_boxes['dashboard']['normal']['core'] = array( 'storyweb_stats_today' => $core['storyweb_stats_today'] ) + $core; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- documented way to order dashboard widgets.
		}
	}
);
