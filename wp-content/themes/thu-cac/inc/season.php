<?php
/**
 * Seasonal looks (Giao diện → Giao diện theo mùa, the "Giao diện mùa" item on the admin bar, or the Customizer).
 * Each season re-colours the whole site through the CSS tokens (assets/css/season-<name>.css, Sáng and Tối) and
 * dresses the home scene (template-parts/scene.php):
 * - Halloween: pumpkin orange and witch purple; bats, pumpkins, a ghost, a spider, storm and fog; cobwebs and bats
 *   on the other pages; the hero chip leads to horror stories.
 * - Giáng sinh: cranberry, pine and candle gold; snow, a snow-capped tram with fairy lights, a lit tree by the
 *   rail, Santa's sleigh across the sky; snow on the blocks; the hero chip leads to sweet stories.
 * Off, one of them, or automatic by date (site time): Halloween 15/10 – 2/11, Giáng sinh the whole of December.
 * Layout and features stay the same; the reader page only takes the colours, nothing moves while reading.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

/** The seasons: name => label. */
function thu_cac_seasons() {
	return array(
		'halloween' => 'Halloween',
		'christmas' => 'Giáng sinh',
	);
}

/** The active season ('halloween', 'christmas'), or ''. */
function thu_cac_season() {
	static $season = null;
	if ( null !== $season ) {
		return $season;
	}
	$mode = (string) get_theme_mod( 'thu_cac_season', 'off' );
	if ( array_key_exists( $mode, thu_cac_seasons() ) ) {
		$season = $mode;
	} elseif ( 'auto' === $mode ) {
		$day = (int) wp_date( 'md' ); // e.g. 1031 for 31 October, site time
		if ( $day >= 1015 && $day <= 1102 ) {
			$season = 'halloween';
		} elseif ( $day >= 1201 ) {
			$season = 'christmas';
		} else {
			$season = '';
		}
	} else {
		$season = '';
	}
	$season = (string) apply_filters( 'thu_cac_season', $season );
	$season = array_key_exists( $season, thu_cac_seasons() ) ? $season : '';
	return $season;
}

add_action(
	'customize_register',
	static function ( $wp_customize ) {
		$wp_customize->add_setting(
			'thu_cac_season',
			array(
				'default'           => 'off',
				'sanitize_callback' => static fn( $value ) => array_key_exists( $value, thu_cac_season_modes() ) ? $value : 'off',
			)
		);
		$wp_customize->add_control(
			'thu_cac_season',
			array(
				'label'       => 'Giao diện theo mùa',
				'description' => 'Halloween: cam bí ngô và tím phù thủy, dơi, bí ngô, ma. Giáng sinh: đỏ, xanh thông và vàng nến, tuyết, cây thông, xe tuần lộc. Tự động: Halloween 15/10 – 2/11, Giáng sinh cả tháng 12.',
				'section'     => 'thu_cac',
				'type'        => 'radio',
				'choices'     => thu_cac_season_modes(),
			)
		);
	}
);

// <html data-season="halloween">: every seasonal style hangs off this attribute.
add_filter(
	'language_attributes',
	static function ( $output ) {
		return thu_cac_season() ? $output . ' data-season="' . esc_attr( thu_cac_season() ) . '"' : $output;
	}
);

add_action(
	'wp_enqueue_scripts',
	static function () {
		$season = thu_cac_season();
		if ( $season ) {
			wp_enqueue_style( 'thu-cac-season', get_theme_file_uri( 'assets/css/season-' . $season . '.css' ), array( 'thu-cac' ), THU_CAC_VERSION );
		}
	},
	20
);

// Cobwebs in two page corners and a few bats crossing the sky now and then (not on the reader page).
add_action(
	'wp_footer',
	static function () {
		if ( 'halloween' !== thu_cac_season() || is_singular( 'chapter' ) ) {
			return;
		}
		$web = '<svg viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M0 0L120 120M0 0L120 40M0 0L40 120M0 0L120 80M0 0L80 120"/><path d="M0 22Q14 16 22 0M0 46Q30 34 46 0M0 72Q46 54 72 0M0 98Q62 74 98 0" /><path d="M14 30Q24 26 30 14M30 62Q50 52 62 30M46 94Q76 78 94 46"/></g></svg>';
		$bat = '<svg viewBox="0 0 64 28"><path fill="currentColor" d="M32 10c2-4 4-5 4-5l1 4c3-1 6 0 8 2 3-5 10-8 19-6-5 2-8 6-8 10-4-2-9-1-12 2-2-3-6-4-9-2-3-2-7-1-9 2-3-3-8-4-12-2 0-4-3-8-8-10 9-2 16 1 19 6 2-2 5-3 8-2l1-4s2 1 4 5z"/></svg>';
		printf(
			'<div class="halloween-deco" aria-hidden="true"><span class="halloween-web halloween-web--tl">%1$s</span><span class="halloween-web halloween-web--br">%1$s</span><span class="halloween-bat halloween-bat--a">%2$s</span><span class="halloween-bat halloween-bat--b">%2$s</span><span class="halloween-bat halloween-bat--c">%2$s</span></div>',
			$web, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed SVG markup.
			$bat // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed SVG markup.
		);
	}
);

/*
 * Quick switch without the Customizer: a "Giao diện mùa" item on the admin bar (on the site and in wp-admin) and
 * Giao diện → Giao diện theo mùa. Both send a nonce-checked link to admin-post.php, then return to the same page.
 */

/** The seasonal modes and their labels. */
function thu_cac_season_modes() {
	return array(
		'halloween' => 'Bật Halloween',
		'christmas' => 'Bật Giáng sinh',
		'off'       => 'Tắt (giao diện thường)',
		'auto'      => 'Tự động theo ngày (Halloween 15/10 – 2/11, Giáng sinh tháng 12)',
	);
}

/** Link that switches the season to $mode. */
function thu_cac_season_switch_url( $mode ) {
	return wp_nonce_url( admin_url( 'admin-post.php?action=thu_cac_season&mode=' . rawurlencode( $mode ) ), 'thu_cac_season' );
}

add_action(
	'admin_post_thu_cac_season',
	static function () {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			wp_die( 'Tài khoản này không được đổi giao diện.', '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'thu_cac_season' );
		$mode = isset( $_GET['mode'] ) ? sanitize_key( wp_unslash( $_GET['mode'] ) ) : '';
		if ( array_key_exists( $mode, thu_cac_season_modes() ) ) {
			set_theme_mod( 'thu_cac_season', $mode );
		}
		$back = wp_get_referer();
		wp_safe_redirect( $back ? $back : admin_url( 'themes.php?page=thu-cac-season' ) );
		exit;
	}
);

add_action(
	'admin_bar_menu',
	static function ( $bar ) {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			return;
		}
		$mode   = (string) get_theme_mod( 'thu_cac_season', 'off' );
		$active = thu_cac_season();
		$icons  = array(
			'halloween' => '🎃',
			'christmas' => '🎄',
		);
		$bar->add_node(
			array(
				'id'    => 'thu-cac-season',
				'title' => esc_html( $active ? $icons[ $active ] . ' ' . thu_cac_seasons()[ $active ] . ': đang bật' : '🎨 Giao diện mùa: tắt' ),
				'href'  => admin_url( 'themes.php?page=thu-cac-season' ),
			)
		);
		foreach ( thu_cac_season_modes() as $key => $label ) {
			$bar->add_node(
				array(
					'parent' => 'thu-cac-season',
					'id'     => 'thu-cac-season-' . $key,
					'title'  => esc_html( ( $key === $mode ? '✓ ' : '' ) . $label ),
					'href'   => thu_cac_season_switch_url( $key ),
				)
			);
		}
	},
	90
);

add_action(
	'admin_menu',
	static function () {
		add_theme_page( 'Giao diện theo mùa', 'Giao diện theo mùa', 'edit_theme_options', 'thu-cac-season', 'thu_cac_season_admin_page' );
	}
);

/** Giao diện → Giao diện theo mùa: the current state and one button per mode. */
function thu_cac_season_admin_page() {
	$mode  = (string) get_theme_mod( 'thu_cac_season', 'off' );
	$modes = thu_cac_season_modes();
	?>
	<div class="wrap">
		<h1>Giao diện theo mùa</h1>
		<p>Halloween: cam bí ngô và tím phù thủy, tàu ma ở trang chủ, dơi, bí ngô và mạng nhện.</p>
		<p>Giáng sinh: đỏ, xanh thông và vàng nến, tuyết rơi, tàu phủ tuyết với dây đèn, cây thông và xe tuần lộc.</p>
		<p>Trang đọc chỉ đổi màu, không có gì chuyển động.</p>
		<p><strong>Đang dùng:</strong> <?php echo esc_html( isset( $modes[ $mode ] ) ? $modes[ $mode ] : $modes['off'] ); ?><?php echo 'auto' === $mode ? esc_html( thu_cac_season() ? ' (hôm nay: ' . thu_cac_seasons()[ thu_cac_season() ] . ')' : ' (hôm nay: giao diện thường)' ) : ''; ?></p>
		<p>
			<?php foreach ( $modes as $key => $label ) : ?>
				<a class="button<?php echo $key === $mode ? ' button-primary' : ''; ?>" href="<?php echo esc_url( thu_cac_season_switch_url( $key ) ); ?>"<?php echo $key === $mode ? ' aria-current="true"' : ''; ?>><?php echo esc_html( $label ); ?></a>
			<?php endforeach; ?>
		</p>
		<p class="description">Cũng đổi được ngay trên thanh quản trị (mục Giao diện mùa) khi đang xem trang.</p>
	</div>
	<?php
}

/**
 * Where the hero chip leads in this season: horror stories at Halloween, sweet ones at Christmas (the first of these
 * genres that exists, else a search).
 */
function thu_cac_season_link() {
	$genres = 'christmas' === thu_cac_season() ? array( 'Ngọt', 'Sủng', 'HE', 'Ngôn tình' ) : array( 'Kinh dị' );
	foreach ( $genres as $name ) {
		$term = taxonomy_exists( 'the_loai' ) ? get_term_by( 'name', $name, 'the_loai' ) : null;
		if ( $term && $term->count > 0 ) {
			return thu_cac_search_url( array( 'the-loai' => $term->slug ) );
		}
	}
	return thu_cac_search_url( array( 'q' => 'christmas' === thu_cac_season() ? 'ngọt' : 'kinh dị' ) );
}
