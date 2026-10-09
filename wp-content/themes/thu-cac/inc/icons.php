<?php
/**
 * Inline SVG icons. Path data from Lucide (https://lucide.dev), ISC License,
 * Copyright (c) 2026 Lucide Icons and Contributors. Generated from lucide-react 1.47.0.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

/**
 * Returns an inline SVG icon (decorative: aria-hidden). Unknown names return an empty string.
 *
 * @param string $name  Icon slug, e.g. 'arrow-right'.
 * @param int    $size  Width/height in px.
 * @param array  $attrs Extra attributes (fill, stroke-width, style, class).
 */
function thu_cac_icon( $name, $size = 18, $attrs = array() ) {
	static $icons = array(
		'align-justify' => '<path d="M3 5h18"/><path d="M3 12h18"/><path d="M3 19h18"/>',
		'align-left' => '<path d="M21 5H3"/><path d="M15 12H3"/><path d="M17 19H3"/>',
		'arrow-left' => '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
		'arrow-right' => '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
		'arrow-up-right' => '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
		'book-open' => '<path d="M12 5v16"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>',
		'bookmark' => '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/>',
		'bookmark-check' => '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/><path d="m9 10 2 2 4-4"/>',
		'chevron-left' => '<path d="m15 18-6-6 6-6"/>',
		'chevron-right' => '<path d="m9 18 6-6-6-6"/>',
		'clock3' => '<circle cx="12" cy="12" r="10"/><path d="M12 6v6h4"/>',
		'eye' => '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
		'headphones' => '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
		'list' => '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
		'loader2' => '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
		'lock-keyhole' => '<circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/>',
		'menu' => '<path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/>',
		'monitor' => '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
		'moon' => '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
		'play-circle' => '<path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z"/><circle cx="12" cy="12" r="10"/>',
		'rotate-ccw' => '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
		'search' => '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
		'sliders-horizontal' => '<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>',
		'sparkles' => '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
		'star' => '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
		'sun' => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
		'type' => '<path d="M12 4v16"/><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/>',
		'x' => '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
	);
	if ( ! isset( $icons[ $name ] ) ) {
		return '';
	}
	$base = array(
		'xmlns'           => 'http://www.w3.org/2000/svg',
		'width'           => (int) $size,
		'height'          => (int) $size,
		'viewBox'         => '0 0 24 24',
		'fill'            => 'none',
		'stroke'          => 'currentColor',
		'stroke-width'    => '2',
		'stroke-linecap'  => 'round',
		'stroke-linejoin' => 'round',
		'aria-hidden'     => 'true',
		'focusable'       => 'false',
		'class'           => 'lucide lucide-' . $name,
	);
	if ( isset( $attrs['class'] ) ) {
		$attrs['class'] = $base['class'] . ' ' . $attrs['class'];
	}
	$html = '<svg';
	foreach ( array_merge( $base, $attrs ) as $key => $value ) {
		$html .= ' ' . $key . '="' . esc_attr( $value ) . '"';
	}
	return $html . '>' . $icons[ $name ] . '</svg>';
}

/**
 * Echoes thu_cac_icon(). The markup is built only from the fixed table above and escaped attributes.
 */
function thu_cac_the_icon( $name, $size = 18, $attrs = array() ) {
	echo thu_cac_icon( $name, $size, $attrs ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}
