<?php
/**
 * Page-wide decoration ("decor"): a layer inside .sky (fixed, behind every block), so what drifts there shows
 * through the liquid glass, blurred, and never covers text. One per look, each in its own files:
 * - plain look: template-parts/decor.php + assets/css/decor.css (section "Plain look");
 * - Halloween: template-parts/decor-halloween.php + assets/css/season-halloween.css;
 * - Giáng sinh: template-parts/decor-christmas.php + assets/css/season-christmas.css.
 * Not on the reader page: nothing moves while reading. assets/js/decor.js hands the scroll offset to the layer as
 * --sy (a px number), so its parts can drift at their own depth while the page scrolls.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

/** Every page except the reader. */
function thu_cac_decor_enabled() {
	return ! is_admin() && ! is_singular( 'chapter' );
}

/**
 * Deterministic random numbers in [0, 1) for placing particles: the same sky on every page view (and no layout
 * change between loads). Usage: $rand = thu_cac_decor_rng( 42 ); $x = $rand() * 100;
 */
function thu_cac_decor_rng( $seed ) {
	$seed = (int) $seed;
	return static function () use ( &$seed ) {
		$seed = ( $seed * 1103515245 + 12345 ) % 2147483648;
		return $seed / 2147483648;
	};
}

/** Prints the layer; called inside .sky in header.php. */
function thu_cac_decor_layer() {
	if ( ! thu_cac_decor_enabled() ) {
		return;
	}
	$season = function_exists( 'thu_cac_season' ) ? thu_cac_season() : '';
	echo '<div class="decor decor--' . esc_attr( $season ? $season : 'default' ) . '" data-decor>';
	get_template_part( 'template-parts/decor', $season ? $season : null );
	echo '</div>';
}

add_action(
	'wp_enqueue_scripts',
	static function () {
		if ( ! thu_cac_decor_enabled() ) {
			return;
		}
		$uri = get_template_directory_uri() . '/assets';
		wp_enqueue_style( 'thu-cac-decor', $uri . '/css/decor.css', array( 'thu-cac' ), THU_CAC_VERSION );
		wp_enqueue_script_module( 'thu-cac-decor', $uri . '/js/decor.js', array(), THU_CAC_VERSION );
	},
	15
);
