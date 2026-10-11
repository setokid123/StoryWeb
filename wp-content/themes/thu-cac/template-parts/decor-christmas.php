<?php
/**
 * Page-wide decoration for Giáng sinh, "Thắp sáng sân ga trên mây" (lighting the station above the clouds). Printed
 * by inc/decor.php inside .sky, so it is fixed, behind every block, and absent on the reader page; styles in
 * assets/css/season-christmas.css (section "Page-wide layer").
 *
 * Back to front: the sky (a cold wash and sun rays by day, aurora curtains by night); stars or diamond dust; bokeh
 * discs that glow through the liquid glass; a cloud bank with snowy pines and a tiny lit station hut; far snow; the
 * signature, a mini tram drawn by two reindeer with a comet trail and stardust; mid snow; the station-hall garland
 * (six pine swags whose bulbs light up swag by swag, then chase) and glass baubles in the side gutters; near snow;
 * on phones and tablets, a few big flakes at the lens that glow through the glass while scrolling.
 * Positions come from thu_cac_decor_rng(), so the sky is the same on every load. Numbers are printed with %F (never
 * a locale decimal comma). Decorative only.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

/* ---------- Shared shapes ---------- */
// Bauble symbol: sphere r 14, gold cap, a band, a specular arc and a tiny reflected window grid.
$thu_cac_xm_bauble = static function ( $id, $band ) {
	return sprintf(
		'<symbol id="xm-bauble-%1$s" viewBox="0 0 30 34"><rect x="11" y="0" width="8" height="5" rx="1.5" fill="#d9a441"/><rect x="12.5" y="1" width="1.4" height="3" rx=".7" fill="#fff3c4" opacity=".7"/><circle cx="15" cy="19" r="14" fill="url(#xm-g%1$s)"/><path d="M1.5 17.5Q15 22.5 28.5 17.5L28.7 20.5Q15 25.5 1.3 20.5Z" fill="%2$s" opacity=".9"/><path d="M5.6 15.6A10 10 0 0 1 11.4 9.6" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.6" stroke-linecap="round"/><g fill="#ffffff" opacity=".35"><rect x="18.5" y="10" width="1.6" height="1.6"/><rect x="20.6" y="10" width="1.6" height="1.6"/><rect x="18.5" y="12.1" width="1.6" height="1.6"/><rect x="20.6" y="12.1" width="1.6" height="1.6"/><rect x="18.5" y="14.2" width="1.6" height="1.6"/><rect x="20.6" y="14.2" width="1.6" height="1.6"/></g></symbol>',
		$id,
		$band
	);
};
$thu_cac_xm_glow = static function ( $id, $rgb, $alpha ) {
	return sprintf( '<radialGradient id="%1$s"><stop offset="0" stop-color="rgb(%2$s)" stop-opacity="%3$.2F"/><stop offset="1" stop-color="rgb(%2$s)" stop-opacity="0"/></radialGradient>', $id, $rgb, $alpha );
};
$thu_cac_xm_defs  = '<svg class="xm-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>';
$thu_cac_xm_defs .= '<symbol id="xm-spark" viewBox="-10 -10 20 20"><path d="M0-10C.9-3.2 3.2-.9 10 0 3.2.9.9 3.2 0 10-.9 3.2-3.2.9-10 0-3.2-.9-.9-3.2 0-10z"/></symbol>';
$thu_cac_xm_defs .= '<symbol id="xm-crystal" viewBox="-10 -10 20 20"><path fill="none" stroke-linecap="round" d="M-9 0L9 0M5 0l2.5 2.5M5 0l2.5-2.5M7.2 0l2.5 2.5M7.2 0l2.5-2.5M-4.9 0l-2.5-2.5M-4.9 0l-2.5 2.5M-7.2 0l-2.5-2.5M-7.2 0l-2.5 2.5M-4.5-7.8L4.5 7.8M2.5 4.3l-.9 3.4M2.5 4.3l3.4.9M3.6 6.2l-.9 3.4M3.6 6.2l3.4.9M-2.5-4.3l.9-3.4M-2.5-4.3l-3.4-.9M-3.6-6.2l.9-3.4M-3.6-6.2l-3.4-.9M4.5-7.8L-4.5 7.8M-2.5 4.3l-3.4.9M-2.5 4.3l.9 3.4M-3.6 6.2l-3.4.9M-3.6 6.2l.9 3.4M2.5-4.3l3.4-.9M2.5-4.3l-.9-3.4M3.6-6.2l3.4-.9M3.6-6.2l-.9-3.4"/></symbol>';
$thu_cac_xm_defs .= '<radialGradient id="xm-soft"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#ffffff" stop-opacity=".8"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>';
// Sáng: a soft flake (white core, a feathered icy edge, no rim) over a cool glow centred under it, so white snow
// reads on white porcelain as snow and not as beads; the big lens flakes have their own gradient.
$thu_cac_xm_defs .= '<radialGradient id="xm-flake-l"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".8" stop-color="#d9eaf3" stop-opacity=".7"/><stop offset="1" stop-color="#d9eaf3" stop-opacity="0"/></radialGradient>';
$thu_cac_xm_defs .= '<radialGradient id="xm-lens"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".5" stop-color="#f4f9fc" stop-opacity=".8"/><stop offset="1" stop-color="#e2eef4" stop-opacity="0"/></radialGradient>';
$thu_cac_xm_defs .= '<radialGradient id="xm-shade"><stop offset="0" stop-color="#46789a" stop-opacity=".22"/><stop offset=".6" stop-color="#46789a" stop-opacity=".12"/><stop offset="1" stop-color="#46789a" stop-opacity="0"/></radialGradient>';
$thu_cac_xm_defs .= $thu_cac_xm_glow( 'xm-halo', '255,225,160', .35 ) . $thu_cac_xm_glow( 'xm-dust-halo', '255,214,140', .4 ) . $thu_cac_xm_glow( 'xm-fl', '255,240,200', .9 ) . $thu_cac_xm_glow( 'xm-lamp-halo', '255,211,107', .35 );
$thu_cac_xm_defs .= $thu_cac_xm_glow( 'xm-hr', '255,77,94', .45 ) . $thu_cac_xm_glow( 'xm-hy', '255,209,102', .45 ) . $thu_cac_xm_glow( 'xm-hg', '61,220,132', .45 ) . $thu_cac_xm_glow( 'xm-hb', '92,184,255', .45 );
$thu_cac_xm_defs .= $thu_cac_xm_glow( 'xm-glow', '255,214,140', .25 ) . $thu_cac_xm_glow( 'xm-wglow', '255,211,107', .5 ) . $thu_cac_xm_glow( 'xm-nose', '255,59,78', .35 );
$thu_cac_xm_defs .= '<linearGradient id="xm-car" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d63447"/><stop offset="1" stop-color="#8e1630"/></linearGradient>';
$thu_cac_xm_defs .= '<radialGradient id="xm-gr" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ff7a80"/><stop offset=".4" stop-color="#e5484d"/><stop offset="1" stop-color="#8e1630"/></radialGradient>';
$thu_cac_xm_defs .= '<radialGradient id="xm-gg" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff0c2"/><stop offset=".4" stop-color="#ffd27a"/><stop offset="1" stop-color="#b7791f"/></radialGradient>';
$thu_cac_xm_defs .= '<radialGradient id="xm-gi" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#f2fbff"/><stop offset=".4" stop-color="#bfe3f2"/><stop offset="1" stop-color="#4f8fb0"/></radialGradient>';
$thu_cac_xm_defs .= '<radialGradient id="xm-gp" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#8ce8b8"/><stop offset=".4" stop-color="#3fbf86"/><stop offset="1" stop-color="#145a3c"/></radialGradient>';
$thu_cac_xm_defs .= $thu_cac_xm_bauble( 'r', '#f2c14e' ) . $thu_cac_xm_bauble( 'g', '#c0283d' ) . $thu_cac_xm_bauble( 'i', '#ffffff' ) . $thu_cac_xm_bauble( 'p', '#f2c14e' );
// Velvet bow with a pine cone, for the garland's joints (the knot at 0,0).
$thu_cac_xm_defs .= '<g id="xm-bow"><path d="M0 9V13" stroke="#5b3a22" stroke-width=".8"/><ellipse cx="0" cy="19" rx="4" ry="6" fill="#6b4226"/><path d="M-3 15.5Q0 17.5 3 15.5M-3.8 18.6Q0 20.6 3.8 18.6M-3.2 21.8Q0 23.6 3.2 21.8" fill="none" stroke="#8a5a3b" stroke-width="1" stroke-dasharray="1.5 1.2"/><path d="M-1 1L-5 9.5L-3 8.8L-2.4 10.8L1 2Z" fill="#a51d31"/><path d="M1 1L5 9L3 8.4L2.5 10.4L-.8 2Z" fill="#a51d31"/><path d="M0 0C-4-6.5-11.5-7.5-11-1.2C-10.6 3.8-4.5 3.4 0 0Z" fill="#c0283d"/><path d="M0 0C4-6.5 11.5-7.5 11-1.2C10.6 3.8 4.5 3.4 0 0Z" fill="#c0283d"/><path d="M-2-.6C-5-3.4-8-3.6-9-1.4M2-.6C5-3.4 8-3.6 9-1.4" fill="none" stroke="#8e1630" stroke-width=".8" stroke-linecap="round"/><circle r="2.6" fill="#f2c14e"/></g>';
// Reindeer, leaping to the left (legs first, so the body covers their tops).
$thu_cac_xm_defs .= '<g id="xm-deer"><path d="M24 26L20 31L24 34M28 27L25 32L29 35M46 25L53 30L60 32M43 26L50 32L57 35" fill="none" stroke="#8a5a3b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 8C12 4 13 1 16-1M14 4L11 2M15 1L13-2M15 8C16 4 18 2 21 1M17 4L17 0M19 2.5L21-1" fill="none" stroke="#5b3a22" stroke-width="1.6" stroke-linecap="round"/><path d="M20 18C25 13 40 13 48 16C53 18 54 24 49 26C42 29 28 29 22 27C18 25 17 21 20 18Z" fill="#8a5a3b"/><path d="M14 12C16 16 18 19 21 21L28 18C24 16 21 12 19 8Z" fill="#8a5a3b"/><path d="M17 8C14 6 9 7 5 9C2 10 1 13 3 14C6 15 11 14 16 13Z" fill="#8a5a3b"/><path d="M17 9L22 7.5L18.5 11Z" fill="#8a5a3b"/><path d="M23 25C30 28 42 28 48 25C46 27.5 40 29 34 29C28 29 24 27.5 23 25Z" fill="#f3e1c7"/><path d="M48 17C51 14 54 14 55 16C53 17 51 18 49 19Z" fill="#f3e1c7"/><path d="M3.4 13.6C6 14.6 10 14.2 13 13" fill="none" stroke="#f3e1c7" stroke-width="1.2" stroke-linecap="round"/><circle cx="8.5" cy="10.2" r=".9" fill="#2a1a10"/><path d="M20.5 18.5C22.5 21.5 23.5 24.5 22.8 27.5" fill="none" stroke="#c0283d" stroke-width="1.6" stroke-linecap="round"/><circle cx="22.8" cy="27.8" r="1.4" fill="#f2c14e"/></g>';
$thu_cac_xm_defs .= '</defs></svg>';

/* ---------- 1. Sky ---------- */
$thu_cac_xm_sky = '<div class="xm-sky"><i class="xm-ray xm-ray--1"></i><i class="xm-ray xm-ray--2"></i><i class="xm-ray xm-ray--3"></i><div class="xm-aurora"><i></i><i></i><i></i></div></div>';

/* ---------- 2. Stars / diamond dust: 14, none over the hero heading (x 4-52vw, y < 44vh) ---------- */
$thu_cac_rand     = thu_cac_decor_rng( 2412 );
$thu_cac_xm_stars = '';
$thu_cac_n        = 0;
for ( $thu_cac_try = 0; $thu_cac_n < 14 && $thu_cac_try < 400; $thu_cac_try++ ) {
	$thu_cac_x = $thu_cac_rand() * 100;
	$thu_cac_u = $thu_cac_rand();
	$thu_cac_s = 6 + $thu_cac_rand() * 10;
	$thu_cac_d = 6 + $thu_cac_rand() * 5;
	$thu_cac_l = $thu_cac_rand() * $thu_cac_d;
	if ( $thu_cac_x > 4 && $thu_cac_x < 52 && 8.9 + $thu_cac_u * 66.1 < 44 ) { // top: 80px (~8.9vh) to 75vh
		continue;
	}
	$thu_cac_xm_stars .= sprintf(
		'<svg class="xm-star%s" viewBox="-16 -16 32 32" style="left:%.1F%%;top:calc(80px + %.3F * (75vh - 80px));--s:%.1Fpx;--d:%.1Fs;--dl:-%.1Fs"><circle class="xm-star__halo" r="16"/><use href="#xm-spark" x="-10" y="-10" width="20" height="20"/></svg>',
		0 === $thu_cac_n % 3 ? ' xm-star--gold' : '',
		$thu_cac_x,
		$thu_cac_u,
		$thu_cac_s,
		$thu_cac_d,
		$thu_cac_l
	);
	++$thu_cac_n;
}

/* ---------- 3. Bokeh: 6 in the gutters, 4 low in the middle; none in the hero heading's corner ---------- */
// Per disc: dark colour and alpha, light colour and alpha (cycled: gold, cranberry / rose, pine / ice, ice / mint).
$thu_cac_xm_cols  = array(
	array( '255 210 122', .42, '255 196 90', .34 ),
	array( '255 93 108', .34, '255 120 130', .22 ),
	array( '63 191 134', .32, '120 185 225', .28 ),
	array( '159 216 255', .30, '90 190 150', .18 ),
);
$thu_cac_rand     = thu_cac_decor_rng( 2512 );
$thu_cac_xm_bokeh = '';
for ( $thu_cac_i = 0; $thu_cac_i < 10; $thu_cac_i++ ) {
	$thu_cac_m = 1;
	if ( $thu_cac_i < 6 ) {
		$thu_cac_right = 0 === $thu_cac_i % 2;
		$thu_cac_x     = $thu_cac_right ? 86 + $thu_cac_rand() * 18 : -4 + $thu_cac_rand() * 18;
		$thu_cac_y     = $thu_cac_right ? 10 + $thu_cac_rand() * 85 : 60 + $thu_cac_rand() * 35;
	} else {
		$thu_cac_x = 20 + $thu_cac_rand() * 60;
		$thu_cac_y = ( $thu_cac_x < 52 ? 60 : 55 ) + $thu_cac_rand() * ( $thu_cac_x < 52 ? 35 : 40 );
		$thu_cac_m = .6;
	}
	$thu_cac_c         = $thu_cac_xm_cols[ $thu_cac_i % 4 ];
	$thu_cac_d         = 11 + $thu_cac_rand() * 8;
	$thu_cac_xm_bokeh .= sprintf(
		'<i class="xm-bk" style="left:%.1F%%;top:%.1F%%;--s:%dpx;--cd:%s;--ad:%.3F;--cl:%s;--al:%.3F;--d:%.1Fs;--dl:-%.1Fs"></i>',
		$thu_cac_x,
		$thu_cac_y,
		(int) ( 60 + $thu_cac_rand() * 110 ),
		$thu_cac_c[0],
		$thu_cac_c[1] * $thu_cac_m,
		$thu_cac_c[2],
		$thu_cac_c[3] * $thu_cac_m,
		$thu_cac_d,
		$thu_cac_rand() * $thu_cac_d
	);
}

/* ---------- 4. Cloud bank: far ridge, snowy pines, a tiny lit platform, near ridge with its shade ---------- */
$thu_cac_far_ridge  = array( array( 40, 160, 85 ), array( 190, 150, 92 ), array( 340, 168, 72 ), array( 480, 155, 88 ), array( 640, 170, 66 ), array( 790, 158, 86 ), array( 950, 148, 100 ), array( 1110, 168, 76 ), array( 1270, 152, 94 ), array( 1420, 160, 82 ) );
$thu_cac_near_ridge = array( array( 0, 195, 95 ), array( 150, 200, 90 ), array( 300, 185, 105 ), array( 450, 198, 100 ), array( 600, 190, 112 ), array( 760, 200, 96 ), array( 900, 188, 108 ), array( 1040, 200, 74 ), array( 1200, 200, 72 ), array( 1360, 190, 118 ) );
$thu_cac_ridge      = static function ( $circles, $class, $dx = 0, $dy = 0 ) {
	$out = '';
	foreach ( $circles as $c ) {
		$out .= sprintf( '<circle cx="%d" cy="%d" r="%d"/>', $c[0] + $dx, $c[1] + $dy, $c[2] );
	}
	return '<g class="' . $class . '">' . $out . '</g>';
};
// The near ridge's top at x, so each pine's foot hides behind it.
$thu_cac_ridge_top = static function ( $x ) use ( $thu_cac_near_ridge ) {
	$top = 220;
	foreach ( $thu_cac_near_ridge as $c ) {
		$dx = abs( $x - $c[0] );
		if ( $dx < $c[2] ) {
			$top = min( $top, $c[1] - sqrt( $c[2] * $c[2] - $dx * $dx ) );
		}
	}
	return $top;
};
$thu_cac_pines = '';
$thu_cac_caps  = '';
foreach ( array( array( 170, 30 ), array( 215, 24 ), array( 1190, 26 ), array( 1250, 34 ), array( 1300, 22 ) ) as $thu_cac_p ) {
	$thu_cac_x      = $thu_cac_p[0];
	$thu_cac_h      = $thu_cac_p[1];
	$thu_cac_w      = $thu_cac_h * .62;
	$thu_cac_b      = $thu_cac_ridge_top( $thu_cac_x ) + 6;
	$thu_cac_pines .= sprintf(
		'<path d="M%1$.1F %2$.1FL%3$.1F %2$.1FL%4$.1F %5$.1FZM%6$.1F %7$.1FL%8$.1F %7$.1FL%4$.1F %9$.1FZM%10$.1F %11$.1FL%12$.1F %11$.1FL%4$.1F %13$.1FZ"/>',
		$thu_cac_x - $thu_cac_w / 2,
		$thu_cac_b,
		$thu_cac_x + $thu_cac_w / 2,
		$thu_cac_x,
		$thu_cac_b - $thu_cac_h * .55,
		$thu_cac_x - $thu_cac_w * .38,
		$thu_cac_b - $thu_cac_h * .3,
		$thu_cac_x + $thu_cac_w * .38,
		$thu_cac_b - $thu_cac_h * .8,
		$thu_cac_x - $thu_cac_w * .26,
		$thu_cac_b - $thu_cac_h * .58,
		$thu_cac_x + $thu_cac_w * .26,
		$thu_cac_b - $thu_cac_h
	);
	$thu_cac_caps  .= sprintf(
		'<path d="M%1$.1F %2$.1FL%3$.1F %4$.1FL%5$.1F %2$.1FL%6$.1F %7$.1FL%3$.1F %8$.1FL%9$.1F %7$.1FZ"/>',
		$thu_cac_x - $thu_cac_w * .16,
		$thu_cac_b - $thu_cac_h * .8,
		$thu_cac_x,
		$thu_cac_b - $thu_cac_h,
		$thu_cac_x + $thu_cac_w * .16,
		$thu_cac_x + $thu_cac_w * .07,
		$thu_cac_b - $thu_cac_h * .76,
		$thu_cac_b - $thu_cac_h * .8,
		$thu_cac_x - $thu_cac_w * .07
	);
}
// A tiny lit station on the far ridge's crown (x 1110, top y 92): a hut with two windows under a snowy gable, and
// a platform lamp on each shoulder of the ridge (its top is y 101 there), so nothing floats.
$thu_cac_lamps = '';
foreach ( array( 1074, 1146 ) as $thu_cac_x ) {
	$thu_cac_lamps .= sprintf( '<circle class="xm-bank__halo" cx="%1$d" cy="82" r="8"/><rect x="%2$.1F" y="83" width="1.6" height="20"/><path d="M%3$.1F 81.4H%4$.1F"/><circle class="xm-bank__head" cx="%1$d" cy="82" r="2.4"/>', $thu_cac_x, $thu_cac_x - .8, $thu_cac_x - 3, $thu_cac_x + 3 );
}
$thu_cac_hut = '<g class="xm-bank__hut"><rect class="xm-bank__wall" x="1097" y="83" width="26" height="14"/><rect class="xm-bank__win" x="1100.5" y="87" width="6" height="4.4" rx=".6"/><rect class="xm-bank__win" x="1113.5" y="87" width="6" height="4.4" rx=".6"/><circle class="xm-bank__halo" cx="1103.5" cy="89.2" r="7"/><circle class="xm-bank__halo" cx="1116.5" cy="89.2" r="7"/><path class="xm-bank__roof" d="M1091 85L1110 74L1129 85Z"/><path class="xm-bank__snow" d="M1091.6 84.2L1110 74.2L1128.4 84.2"/></g>';
$thu_cac_xm_bank = '<svg class="xm-bank" viewBox="0 0 1440 170" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">'
	. $thu_cac_ridge( $thu_cac_far_ridge, 'xm-bank__far' )
	. $thu_cac_hut . '<g class="xm-bank__lamps">' . $thu_cac_lamps . '</g>'
	. '<g class="xm-bank__pine">' . $thu_cac_pines . '</g><g class="xm-bank__cap">' . $thu_cac_caps . '</g>'
	. $thu_cac_ridge( $thu_cac_near_ridge, 'xm-bank__shade', 6, 3 )
	. $thu_cac_ridge( $thu_cac_near_ridge, 'xm-bank__near' )
	. '</svg>';

/* ---------- 5-7. Snow: one pattern tile per depth (W x 600), flakes kept off the tile edges ---------- */
// Each round flake sits on a static cool glow centred under it (Sáng only: white snow on porcelain needs it to be seen).
$thu_cac_xm_snow = static function ( $name, $w, $seed, $round, $rmin, $rmax, $crystals, $cmin, $cmax ) {
	$rand = thu_cac_decor_rng( $seed );
	$out  = '';
	for ( $i = 0; $i < $round; $i++ ) {
		$r    = $rmin + $rand() * ( $rmax - $rmin );
		$x    = $r + 2 + $rand() * ( $w - 2 * $r - 4 );
		$y    = $r + 2 + $rand() * ( 596 - 2 * $r );
		$out .= sprintf( '<circle class="xm-flake-sh" cx="%1$.1F" cy="%2$.1F" r="%3$.2F"/><circle class="xm-flake" cx="%1$.1F" cy="%2$.1F" r="%3$.2F"/>', $x, $y, $r );
	}
	for ( $i = 0; $i < $crystals; $i++ ) {
		$s    = $cmin + $rand() * ( $cmax - $cmin );
		$x    = $s / 2 + 1 + $rand() * ( $w - $s - 2 );
		$y    = $s / 2 + 1 + $rand() * ( 598 - $s );
		$out .= sprintf( '<use class="xm-crys" href="#xm-crystal" x="%.1F" y="%.1F" width="%.1F" height="%.1F" transform="rotate(%d %.1F %.1F)"/>', $x - $s / 2, $y - $s / 2, $s, $s, (int) ( $rand() * 60 ), $x, $y );
	}
	return sprintf(
		'<div class="xm-snow xm-snow--%1$s"><div class="xm-snow__fall"><div class="xm-snow__sway"><svg width="100%%" height="100%%" aria-hidden="true" focusable="false"><defs><pattern id="xm-tile-%1$s" patternUnits="userSpaceOnUse" width="%2$d" height="600">%3$s</pattern></defs><rect width="100%%" height="100%%" fill="url(#xm-tile-%1$s)"/></svg></div></div></div>',
		$name,
		$w,
		$out
	);
};

/* ---------- 6. The reindeer tram (viewBox 260 x 84, facing left) ---------- */
$thu_cac_xm_sleigh = '<svg class="xm-sleigh" viewBox="0 0 260 84" aria-hidden="true" focusable="false">'
	. '<circle class="xm-sleigh__dark" cx="184" cy="51" r="70" fill="url(#xm-glow)"/>'
	. '<path d="M23 49Q48 60 75 44Q102 60 128 50" fill="none" stroke="#5b3a22" stroke-width=".9"/>'
	. '<g><circle cx="38.2" cy="55" r="1.8" fill="#ff4d5e"/><circle cx="66.9" cy="50" r="1.8" fill="#ffd166"/><circle cx="88.4" cy="52.2" r="1.8" fill="#3ddc84"/><circle cx="101.8" cy="55.3" r="1.8" fill="#5cb8ff"/><circle cx="114.9" cy="55.2" r="1.8" fill="#ff4d5e"/></g>'
	. '<g transform="translate(52 16)"><use href="#xm-deer"/><circle cx="2.2" cy="12" r="1.7" fill="#2a1a10"/></g>'
	. '<g transform="translate(0 22)"><use href="#xm-deer"/><circle class="xm-sleigh__dark" cx="2.2" cy="12" r="8" fill="url(#xm-nose)"/><circle cx="2.2" cy="12" r="3" fill="#ff3b4e"/><circle cx="1.3" cy="11" r=".9" fill="#ffd0d4"/></g>'
	// Book sack on the roof: three spines peek out, a gold tie.
	. '<rect x="147" y="8" width="6" height="15" rx="1" fill="#c0283d" transform="rotate(-12 150 16)"/><rect x="155" y="6" width="6" height="16" rx="1" fill="#1f7a52"/><rect x="162.5" y="9" width="6" height="14" rx="1" fill="#fff6e0" transform="rotate(10 165.5 16)"/>'
	. '<path d="M142 34C139 27 142 21.5 148 19.5L168 19.5C174 21.5 177 27 174 34Z" fill="#c99a5b"/><path d="M150 23C149 26.5 149 30.5 151 34M163.5 23C165.2 27 165.4 30.5 164.5 34" fill="none" stroke="#a57a43" stroke-width="1" stroke-linecap="round"/>'
	. '<rect x="146" y="18.6" width="24" height="3" rx="1.5" fill="#f2c14e"/><path d="M158 20C155 16.6 152 17.6 153.4 20.2ZM158 20C161 16.6 164 17.6 162.6 20.2Z" fill="#f2c14e"/>'
	// Pantograph with a Santa hat.
	. '<path d="M177 34L184 24L191 34M184 24V21M178 21H190" fill="none" stroke="#3b2a20" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'
	. '<path d="M178.6 18.4C179 11 182.6 6.8 187.6 6.4C191.4 6.2 194.2 8.4 195.4 11.6C193.2 10.6 190.8 10.9 190.2 12.8C190.8 14.6 191.2 16.6 191.4 18.4Z" fill="#d6283f"/><rect x="177" y="16.6" width="15" height="4" rx="2" fill="#ffffff"/><circle cx="195.6" cy="11.8" r="2.4" fill="#ffffff"/>'
	// The car.
	. '<path d="M236 75.5H140C131 75.5 125.6 71.4 125.6 65.4C125.6 61.2 129.4 60.4 131.2 63.2M150 68V75.5M224 68V75.5" fill="none" stroke="#f2c14e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
	. '<rect x="128" y="34" width="112" height="34" rx="12" fill="url(#xm-car)"/><rect x="137" y="37" width="94" height="2.6" rx="1.3" fill="#ffffff" opacity=".35"/>'
	. '<rect x="129" y="56" width="110" height="4" fill="#f2c14e"/>'
	. '<circle class="xm-sleigh__dark" cx="151" cy="46" r="13" fill="url(#xm-wglow)"/><circle class="xm-sleigh__dark" cx="181" cy="46" r="13" fill="url(#xm-wglow)"/><circle class="xm-sleigh__dark" cx="211" cy="46" r="13" fill="url(#xm-wglow)"/>'
	. '<rect x="140" y="40" width="22" height="12" rx="4" fill="#ffd36b"/><rect x="170" y="40" width="22" height="12" rx="4" fill="#ffd36b"/><rect x="200" y="40" width="22" height="12" rx="4" fill="#ffd36b"/>'
	. '<path d="M144 49.5l5-7M174 49.5l5-7M204 49.5l5-7" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>'
	. '<circle cx="132" cy="50" r="2.4" fill="#fff6c8"/><rect x="226" y="40" width="9" height="20" rx="3" fill="#ffffff" opacity=".18"/>'
	. '</svg>';

/* ---------- 6b. Stardust: each grain sparkles as the tram passes over it ---------- */
// p = how far along its crossing the tram is when it passes x (vw), for a 1440px (and a 390px) wide screen.
$thu_cac_xm_dust = '';
$thu_cac_rand    = thu_cac_decor_rng( 2612 );
foreach ( array( 85, 72, 60, 48, 36, 24, 12, 2 ) as $thu_cac_x ) {
	$thu_cac_p        = ( 1460 - 14.4 * $thu_cac_x + 220 ) / 1720;
	$thu_cac_q        = ( 410 - 3.9 * $thu_cac_x + 130 ) / 670;
	$thu_cac_top      = 86 + 36 - 24 * sin( M_PI * $thu_cac_p );
	$thu_cac_xm_dust .= sprintf(
		'<svg class="xm-dust" viewBox="-16 -16 32 32" style="left:%dvw;--top:%.1Fpx;--top-sm:%.1Fpx;--s:%.1Fpx;--d:%.2Fs;--d-home:%.2Fs;--dp:%.2Fs;--dp-home:%.2Fs"><circle class="xm-dust__halo" r="16"/><use href="#xm-spark" x="-10" y="-10" width="20" height="20"/><circle class="xm-dust__core" r="2"/></svg>',
		$thu_cac_x,
		$thu_cac_top,
		70 + ( $thu_cac_top - 86 ) * .6,
		10 + $thu_cac_rand() * 6,
		3 + 9.6 * $thu_cac_p,
		4.2 + 9.6 * $thu_cac_p,
		3 + 9.6 * $thu_cac_q,
		4.2 + 9.6 * $thu_cac_q
	);
}

/* ---------- 8. Station-hall garland: six pine boughs with nine bulbs each tucked into them, bows at the joints ---------- */
// Each bough is a quadratic swag (ends y 12, control y 172: it hangs to y 92). Its needles are drawn along the curve
// by markers, two tufts oriented to the tangent at every vertex of a lightly jittered polyline, so its edges read as
// a pine bough and not as a zip; snow lies in clumps on its upper side. The lights live in their own SVG
// behind the boughs: only the glass peeks out below the needles (the middle bulb to ~y 110, a ceiling garland clear
// of the hero chip and the page eyebrows), and their chase never repaints the boughs (own layer, see the CSS).
$thu_cac_xm_bc     = array( 'r', 'y', 'g', 'b' );
$thu_cac_xm_q      = static function ( $x0, $t ) {
	return array( $x0 + 360 * $t, 12 + 320 * $t * ( 1 - $t ) );
};
$thu_cac_rand      = thu_cac_decor_rng( 2712 );
$thu_cac_xm_lights = '';
$thu_cac_xm_boughs = '';
$thu_cac_xm_flash  = '';
$thu_cac_xm_bows   = '';
for ( $thu_cac_k = 0; $thu_cac_k < 6; $thu_cac_k++ ) {
	$thu_cac_x0 = 360 * $thu_cac_k;
	$thu_cac_a  = '';
	$thu_cac_b  = '';
	for ( $thu_cac_j = 1; $thu_cac_j <= 9; $thu_cac_j++ ) {
		list( $thu_cac_x, $thu_cac_y ) = $thu_cac_xm_q( $thu_cac_x0, $thu_cac_j / 10 );
		$thu_cac_bulb = sprintf(
			'<circle class="xm-halo xm-halo--%1$s" cx="%2$.1F" cy="%3$.1F" r="12"/><rect x="%4$.1F" y="%5$.1F" width="5" height="4" rx="1.2"/><ellipse class="xm-glass--%1$s" cx="%2$.1F" cy="%3$.1F" rx="4.4" ry="6"/><ellipse class="xm-hi" cx="%6$.1F" cy="%7$.1F" rx="1.1" ry="1.8"/>',
			$thu_cac_xm_bc[ ( $thu_cac_k * 9 + $thu_cac_j - 1 ) % 4 ],
			$thu_cac_x,
			$thu_cac_y + 11.5,
			$thu_cac_x - 2.5,
			$thu_cac_y + 3.5,
			$thu_cac_x - 1.5,
			$thu_cac_y + 9.6
		);
		if ( 1 === $thu_cac_j % 2 ) {
			$thu_cac_a .= $thu_cac_bulb;
		} else {
			$thu_cac_b .= $thu_cac_bulb;
		}
		$thu_cac_xm_flash .= sprintf( '<circle cx="%.1F" cy="%.1F" r="16"/>', $thu_cac_x, $thu_cac_y + 11.5 );
	}
	$thu_cac_xm_lights .= sprintf( '<g class="xm-swag" style="--k:%1$d"><g class="xm-bulbs xm-bulbs--a">%2$s</g><g class="xm-bulbs xm-bulbs--b">%3$s</g></g>', $thu_cac_k, $thu_cac_a, $thu_cac_b );
	// Two needle passes, the second half a step along the first; each vertex is nudged up to 0.8 off the curve.
	$thu_cac_pa = '';
	$thu_cac_pb = '';
	for ( $thu_cac_i = 0; $thu_cac_i <= 64; $thu_cac_i++ ) {
		list( $thu_cac_x, $thu_cac_y ) = $thu_cac_xm_q( $thu_cac_x0, $thu_cac_i / 64 );
		$thu_cac_pa                   .= sprintf( '%s%.1F %.1F', 0 === $thu_cac_i ? 'M' : 'L', $thu_cac_x, $thu_cac_y + ( $thu_cac_rand() - .5 ) * 1.6 );
		if ( $thu_cac_i < 64 ) {
			list( $thu_cac_x, $thu_cac_y ) = $thu_cac_xm_q( $thu_cac_x0, ( $thu_cac_i + .5 ) / 64 );
			$thu_cac_pb                   .= sprintf( '%s%.1F %.1F', 0 === $thu_cac_i ? 'M' : 'L', $thu_cac_x, $thu_cac_y + ( $thu_cac_rand() - .5 ) * 1.6 );
		}
	}
	// Snow: clumps of two overlapping balls lying on the bough's upper side (pushed out along the curve's normal),
	// big and close on the flat middle, small and sparse on the steep ends. Sáng adds a cool underside (a copy 1px lower).
	$thu_cac_sn = '';
	for ( $thu_cac_i = 0; $thu_cac_i < 18; $thu_cac_i++ ) {
		$thu_cac_t    = .1 + $thu_cac_i * .8 / 17 + ( $thu_cac_rand() - .5 ) * .025;
		$thu_cac_flat = abs( $thu_cac_t - .5 ) < .22;
		$thu_cac_keep = $thu_cac_rand();
		if ( ! $thu_cac_flat && $thu_cac_keep < .45 ) {
			continue;
		}
		list( $thu_cac_x, $thu_cac_y ) = $thu_cac_xm_q( $thu_cac_x0, $thu_cac_t );
		$thu_cac_tx                   = 360;
		$thu_cac_ty                   = 320 * ( 1 - 2 * $thu_cac_t );
		$thu_cac_len                  = sqrt( $thu_cac_tx * $thu_cac_tx + $thu_cac_ty * $thu_cac_ty );
		$thu_cac_ux                   = $thu_cac_tx / $thu_cac_len;
		$thu_cac_uy                   = $thu_cac_ty / $thu_cac_len;
		$thu_cac_r                    = $thu_cac_flat ? 2.4 + $thu_cac_rand() * 1.5 : 1.4 + $thu_cac_rand() * 1;
		$thu_cac_off                  = 3.6 + $thu_cac_r * .45;
		$thu_cac_cx                   = $thu_cac_x + $thu_cac_uy * $thu_cac_off; // The up normal of (ux, uy) is (uy, -ux).
		$thu_cac_cy                   = $thu_cac_y - $thu_cac_ux * $thu_cac_off;
		$thu_cac_d                    = ( $thu_cac_rand() < .5 ? -1 : 1 ) * $thu_cac_r * .95;
		$thu_cac_sn                  .= sprintf( '<circle cx="%.1F" cy="%.1F" r="%.1F"/><circle cx="%.1F" cy="%.1F" r="%.1F"/>', $thu_cac_cx, $thu_cac_cy, $thu_cac_r, $thu_cac_cx + $thu_cac_ux * $thu_cac_d + $thu_cac_uy * .5, $thu_cac_cy + $thu_cac_uy * $thu_cac_d - $thu_cac_ux * .5, $thu_cac_r * .7 );
	}
	$thu_cac_xm_boughs .= sprintf(
		'<g class="xm-bough"><path class="xm-rope" d="M%1$d 12Q%2$d 172 %3$d 12"/><path class="xm-tufts" marker-mid="url(#xm-tuft-a)" d="%4$s"/><path class="xm-tufts" marker-mid="url(#xm-tuft-b)" d="%5$s"/><use class="xm-bough-snow--u" href="#xm-snow-%6$d" y="1.1"/><g class="xm-bough-snow"><g id="xm-snow-%6$d">%7$s</g></g></g>',
		$thu_cac_x0,
		$thu_cac_x0 + 180,
		$thu_cac_x0 + 360,
		$thu_cac_pa,
		$thu_cac_pb,
		$thu_cac_k,
		$thu_cac_sn
	);
}
for ( $thu_cac_k = 0; $thu_cac_k <= 6; $thu_cac_k++ ) {
	$thu_cac_xm_bows .= sprintf( '<use href="#xm-bow" x="%d" y="13"/>', 360 * $thu_cac_k );
}
// Needle tufts (x runs along the bough, y across it): long dark needles, then mid-green ones with a few lit tips.
$thu_cac_xm_tufts   = '<defs><marker id="xm-tuft-a" markerUnits="userSpaceOnUse" orient="auto" markerWidth="1" markerHeight="1" overflow="visible"><path d="M-1-2L-5.6-7.8M1-1.6L-2.2-8.2M-1 2L-5.6 7.8M1 1.6L-2.2 8.2" fill="none" stroke="#17543a" stroke-width="1.5" stroke-linecap="round"/></marker>'
	. '<marker id="xm-tuft-b" markerUnits="userSpaceOnUse" orient="auto" markerWidth="1" markerHeight="1" overflow="visible"><path d="M0-1L-3.9-6.8M-2.2-.8L-6.2-5.4M0 1L-3.9 6.8M-2.2.8L-6.2 5.4" fill="none" stroke="#2a8a5c" stroke-width="1.25" stroke-linecap="round"/><path d="M.6-2.4L-1.9-6.6M.6 2.4L-1.9 6.6" fill="none" stroke="#5cbf8a" stroke-width=".9" stroke-linecap="round"/></marker></defs>';
$thu_cac_xm_garland = '<div class="xm-garland">'
	. '<svg class="xm-garland__lights" viewBox="0 0 2160 140" aria-hidden="true" focusable="false">' . $thu_cac_xm_lights . '<g class="xm-flash">' . $thu_cac_xm_flash . '</g></svg>'
	. '<svg class="xm-garland__boughs" viewBox="0 0 2160 140" aria-hidden="true" focusable="false">' . $thu_cac_xm_tufts . $thu_cac_xm_boughs . '<g class="xm-bows">' . $thu_cac_xm_bows . '</g></svg>'
	. '</div>';

$thu_cac_xm_baubles = '';
foreach ( array( array( 1, 230, 'r' ), array( 2, 96, 'g' ), array( 3, 104, 'i' ), array( 4, 150, 'p' ) ) as $thu_cac_bb ) {
	$thu_cac_xm_baubles .= sprintf( '<span class="xm-bauble xm-bauble--%1$d" style="--len:%2$dpx"><svg viewBox="0 0 30 34" aria-hidden="true" focusable="false"><use href="#xm-bauble-%3$s" width="30" height="34"/></svg></span>', $thu_cac_bb[0], $thu_cac_bb[1], $thu_cac_bb[2] );
}

// Print, back to front. Everything above is fixed markup or numbers.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed SVG markup and numbers printed with sprintf.
echo $thu_cac_xm_defs;
echo $thu_cac_xm_sky;
echo '<div class="xm-stars">' . $thu_cac_xm_stars . '</div>';
echo '<div class="xm-bokeh">' . $thu_cac_xm_bokeh . '</div>';
echo $thu_cac_xm_bank;
echo $thu_cac_xm_snow( 'far', 430, 1225, 34, .8, 1.6, 0, 0, 0 );
echo '<div class="xm-flight"><div class="xm-flight__x"><div class="xm-flight__y"><span class="xm-flight__dust"></span>' . $thu_cac_xm_sleigh . '</div></div></div>';
echo '<div class="xm-dusts">' . $thu_cac_xm_dust . '</div>';
echo $thu_cac_xm_snow( 'mid', 557, 1226, 30, 2.2, 3.6, 8, 10, 14 );
echo $thu_cac_xm_garland;
echo $thu_cac_xm_baubles;
echo $thu_cac_xm_snow( 'near', 691, 1227, 8, 3.5, 5.5, 5, 18, 26 );
// Phones and tablets: big out-of-focus flakes at the lens, in a 90px column along each screen edge (tile x 0-90; the
// left column starts 30px off screen, the right one ends 30px off it), so they slide half in the gutter, half behind
// the frame's glass, where the cover images cannot hide them. They fade in once the hero is behind (CSS).
$thu_cac_xm_lens = static function ( $side, $flakes ) {
	$out = '';
	foreach ( $flakes as $f ) {
		$out .= sprintf( '<circle class="xm-flake-sh" cx="%1$.1F" cy="%2$.1F" r="%3$.1F"/><circle class="xm-flake" cx="%1$.1F" cy="%2$.1F" r="%3$.1F"/>', $f[0], $f[1], $f[2] );
	}
	return sprintf(
		'<div class="xm-snow xm-snow--lens xm-snow--lens-%1$s"><div class="xm-snow__fall"><div class="xm-snow__sway"><svg width="100%%" height="100%%" aria-hidden="true" focusable="false"><defs><pattern id="xm-tile-lens-%1$s" patternUnits="userSpaceOnUse" width="90" height="600">%2$s</pattern></defs><rect width="100%%" height="100%%" fill="url(#xm-tile-lens-%1$s)"/></svg></div></div></div>',
		$side,
		$out
	);
};
echo $thu_cac_xm_lens( 'l', array( array( 36, 110, 21 ), array( 50, 400, 15 ) ) );
echo $thu_cac_xm_lens( 'r', array( array( 54, 260, 23 ), array( 42, 520, 16 ) ) );
// phpcs:enable
