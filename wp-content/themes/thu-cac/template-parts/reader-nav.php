<?php
/**
 * Chapter navigation, two variants with the same four actions and targets:
 * - 'end'  → end-of-chapter navigation (port of reader-navigation.tsx);
 * - 'dock' → floating glass dock (port of reader-floating-navigation.tsx), hidden + inert until reader.js shows it.
 * First/last chapter: a real disabled button, never a fake link.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

$thu_cac_dock  = 'dock' === ( $args['variant'] ?? 'end' );
$thu_cac_story = $args['story_url'];
$thu_cac_prev  = $args['prev_url'];
$thu_cac_next  = $args['next_url'];
$thu_cac_btn   = $thu_cac_dock ? 'reader-floating-nav__btn' : 'button button--glass reader-nav__btn';
$thu_cac_lbl   = $thu_cac_dock ? 'reader-floating-nav__label' : 'reader-nav__label';
$thu_cac_tab   = $thu_cac_dock ? ' tabindex="-1"' : '';

/** Prints a link, or a disabled button when $url is empty. */
$thu_cac_item = static function ( $url, $class, $label, $inner ) use ( $thu_cac_tab ) {
	if ( $url ) {
		printf( '<a href="%1$s" class="%2$s" aria-label="%3$s"%5$s>%4$s</a>', esc_url( $url ), esc_attr( $class ), esc_attr( $label ), $inner, $thu_cac_tab ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $inner is fixed icon + escaped label.
		return;
	}
	printf( '<button type="button" class="%1$s" aria-label="%2$s" disabled tabindex="-1">%3$s</button>', esc_attr( $class ), esc_attr( $label ), $inner ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
};
$thu_cac_span = static function ( $text ) use ( $thu_cac_lbl ) {
	return '<span class="' . esc_attr( $thu_cac_lbl ) . '">' . esc_html( $text ) . '</span>';
};

if ( $thu_cac_dock ) {
	echo '<div class="reader-dock-wrap" data-reader-dock inert><nav class="reader-floating-nav" aria-label="Điều hướng nhanh" aria-hidden="true"><div class="reader-floating-nav__inner lg" data-refract>';
} else {
	echo '<div data-reader-endnav><nav class="reader-nav lg" aria-label="Điều hướng chương"><div class="reader-nav__grid">';
}

$thu_cac_item( $thu_cac_story, $thu_cac_btn . ( $thu_cac_dock ? '' : ' reader-nav__back' ), 'Về truyện', thu_cac_icon( 'arrow-left', 18 ) . ' ' . $thu_cac_span( 'Về truyện' ) );
$thu_cac_item( $thu_cac_prev, $thu_cac_btn . ( $thu_cac_dock ? '' : ' reader-nav__prev' ), 'Chương trước', thu_cac_icon( 'chevron-left', 18 ) . ' ' . $thu_cac_span( 'Chương trước' ) );
printf(
	'<button type="button" class="%1$s" data-chapter-list-open="%2$s" aria-haspopup="dialog" aria-controls="chapter-list-dialog" aria-label="Danh sách chương"%3$s>%4$s %5$s</button>',
	esc_attr( $thu_cac_btn . ( $thu_cac_dock ? '' : ' reader-nav__list' ) ),
	$thu_cac_dock ? 'dock' : 'end',
	$thu_cac_tab, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal.
	thu_cac_icon( 'list', 18 ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed icon.
	$thu_cac_span( 'Danh sách chương' ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
);
$thu_cac_item( $thu_cac_next, $thu_cac_btn . ( $thu_cac_dock ? '' : ' reader-nav__next' ), 'Chương sau', $thu_cac_span( 'Chương sau' ) . ' ' . thu_cac_icon( 'chevron-right', 18 ) );

echo $thu_cac_dock ? '</div></nav></div>' : '</div></nav></div>';
