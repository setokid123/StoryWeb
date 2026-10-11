<?php
/**
 * Page-wide decoration for the plain look, "Sân ga trên mây" (inc/decor.php; styles in assets/css/decor.css,
 * section "Plain look"). The whole page is the sky the tram crosses: three sheets of stars that drift down-left
 * like calm snow (by night), sun rays and glitter (by day), lamp-like bokeh or glass bubbles that glow through the
 * frosted blocks, tumbling story pages, sparkles, comets falling across the whole screen once the hero is scrolled
 * away, the "TRUYỆN 2D" monogram and a tram drawn as constellations, a
 * cloud sea with a tiny tram that rises once the hero is left behind, and now and then a shooting star, a paper
 * plane, and the Sao Băng Express (night) or a paper squadron (day). Positions come from thu_cac_decor_rng(), so
 * the sky is the same on every load. Decorative only; every number is printed with sprintf.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

// Offsets that repeat a shape reaching over a pattern tile's edge on the opposite side, so the tiles stay seamless.
$thu_cac_dc_wrap = static function ( $cx, $cy, $reach, $tile ) {
	$xs = array( 0 );
	$ys = array( 0 );
	if ( $cx - $reach < 0 ) {
		$xs[] = $tile;
	}
	if ( $cx + $reach > $tile ) {
		$xs[] = -$tile;
	}
	if ( $cy - $reach < 0 ) {
		$ys[] = $tile;
	}
	if ( $cy + $reach > $tile ) {
		$ys[] = -$tile;
	}
	$out = array();
	foreach ( $xs as $dx ) {
		foreach ( $ys as $dy ) {
			$out[] = array( $dx, $dy );
		}
	}
	return $out;
};

// The home hero text at scroll 0 (desktop): x 4-56 %, y 14-78 lvh (headline down to the search and the stats).
// Bright items of 8px or more stay out.
$thu_cac_dc_in_hero = static function ( $x, $y_view, $size ) {
	$cx = $x + $size / 2 / 14.4;
	$cy = $y_view + $size / 2 / 9;
	return $size >= 8 && $cx >= 4 && $cx <= 56 && $cy >= 14 && $cy <= 78;
};
// Phones: the headline spans the whole width, y 12-58 lvh. CSS hides the items tagged here.
$thu_cac_dc_in_hero_m = static function ( $y_view ) {
	return $y_view >= 12 && $y_view <= 58;
};

/* ---- Star sheets: three pattern tiles (1 unit = 1 css px). ---- */
$thu_cac_dc_far  = '';
$thu_cac_dc_rand = thu_cac_decor_rng( 11 );
for ( $thu_cac_i = 0; $thu_cac_i < 90; $thu_cac_i++ ) {
	$thu_cac_x = $thu_cac_dc_rand() * 480;
	$thu_cac_y = $thu_cac_dc_rand() * 480;
	$thu_cac_r = .5 + $thu_cac_dc_rand() * .5;
	$thu_cac_o = .35 + $thu_cac_dc_rand() * .4;
	foreach ( $thu_cac_dc_wrap( $thu_cac_x, $thu_cac_y, $thu_cac_r, 480 ) as $thu_cac_d ) {
		$thu_cac_dc_far .= sprintf( '<circle class="dc-s-far" cx="%.1F" cy="%.1F" r="%.2F" opacity="%.2F"/>', $thu_cac_x + $thu_cac_d[0], $thu_cac_y + $thu_cac_d[1], $thu_cac_r, $thu_cac_o );
	}
}

$thu_cac_dc_mid    = '';
$thu_cac_dc_tints  = array( 'dc-s-w', 'dc-s-w', 'dc-s-w', 'dc-s-warm', 'dc-s-rose', 'dc-s-cool' );
$thu_cac_dc_rand   = thu_cac_decor_rng( 23 );
for ( $thu_cac_i = 0; $thu_cac_i < 36; $thu_cac_i++ ) {
	$thu_cac_x    = $thu_cac_dc_rand() * 560;
	$thu_cac_y    = $thu_cac_dc_rand() * 560;
	$thu_cac_r    = .9 + $thu_cac_dc_rand() * .7;
	$thu_cac_halo = 0 === $thu_cac_i % 3;
	foreach ( $thu_cac_dc_wrap( $thu_cac_x, $thu_cac_y, $thu_cac_r * 3 + 1, 560 ) as $thu_cac_d ) {
		$thu_cac_cx = $thu_cac_x + $thu_cac_d[0];
		$thu_cac_cy = $thu_cac_y + $thu_cac_d[1];
		if ( $thu_cac_halo ) {
			$thu_cac_dc_mid .= sprintf( '<circle class="dc-s-halo" cx="%.1F" cy="%.1F" r="%.2F"/>', $thu_cac_cx, $thu_cac_cy, $thu_cac_r * 3 );
		}
		$thu_cac_dc_mid .= sprintf( '<circle class="dc-s-twin" cx="%.1F" cy="%.1F" r="%.2F"/>', $thu_cac_cx + .8, $thu_cac_cy + .8, $thu_cac_r );
		$thu_cac_dc_mid .= sprintf( '<circle class="%s" cx="%.1F" cy="%.1F" r="%.2F"/>', $thu_cac_dc_tints[ $thu_cac_i % 6 ], $thu_cac_cx, $thu_cac_cy, $thu_cac_r );
	}
}

// The near sheet: a large tile (1120) so its pattern does not show, and no two of its 25 points within 70px of
// each other (measured across the tile's wrap too), so there are no repeated pairs or clusters.
$thu_cac_dc_near  = '';
$thu_cac_dc_rand  = thu_cac_decor_rng( 37 );
$thu_cac_dc_pts   = array();
$thu_cac_dc_place = static function ( $margin ) use ( &$thu_cac_dc_pts, $thu_cac_dc_rand ) {
	for ( $try = 0; $try < 30; $try++ ) {
		$x  = $margin + $thu_cac_dc_rand() * ( 1120 - 2 * $margin );
		$y  = $margin + $thu_cac_dc_rand() * ( 1120 - 2 * $margin );
		$ok = true;
		foreach ( $thu_cac_dc_pts as $p ) {
			$dx = abs( $x - $p[0] );
			$dy = abs( $y - $p[1] );
			$dx = min( $dx, 1120 - $dx );
			$dy = min( $dy, 1120 - $dy );
			if ( $dx * $dx + $dy * $dy < 4900 ) {
				$ok = false;
				break;
			}
		}
		if ( $ok ) {
			break;
		}
	}
	$thu_cac_dc_pts[] = array( $x, $y );
	return array( $x, $y );
};
for ( $thu_cac_i = 0; $thu_cac_i < 20; $thu_cac_i++ ) {
	list( $thu_cac_x, $thu_cac_y ) = $thu_cac_dc_place( 0 );
	$thu_cac_r                     = 1.4 + $thu_cac_dc_rand() * .9;
	foreach ( $thu_cac_dc_wrap( $thu_cac_x, $thu_cac_y, $thu_cac_r * 3.2, 1120 ) as $thu_cac_d ) {
		$thu_cac_dc_near .= sprintf( '<circle class="dc-s-halo" cx="%1$.1F" cy="%2$.1F" r="%3$.2F"/><circle class="dc-s-near" cx="%1$.1F" cy="%2$.1F" r="%4$.2F"/>', $thu_cac_x + $thu_cac_d[0], $thu_cac_y + $thu_cac_d[1], $thu_cac_r * 3.2, $thu_cac_r );
	}
}
for ( $thu_cac_i = 0; $thu_cac_i < 5; $thu_cac_i++ ) {
	$thu_cac_s                     = 6 + $thu_cac_dc_rand() * 4;
	list( $thu_cac_x, $thu_cac_y ) = $thu_cac_dc_place( $thu_cac_s );
	$thu_cac_dc_near              .= sprintf( '<use class="dc-s-spark%s" href="#dc-spark" x="%.1F" y="%.1F" width="%.1F" height="%.1F"/>', 1 === $thu_cac_i % 2 ? ' dc-s-spark--b' : '', $thu_cac_x - $thu_cac_s / 2, $thu_cac_y - $thu_cac_s / 2, $thu_cac_s, $thu_cac_s );
}

/* ---- Bokeh (night) / glass bubbles (day). ---- */
$thu_cac_dc_orbs = '';
$thu_cac_dc_rand = thu_cac_decor_rng( 41 );
for ( $thu_cac_i = 0; $thu_cac_i < 7; $thu_cac_i++ ) {
	$thu_cac_try = 0;
	do {
		$thu_cac_x = 8 + $thu_cac_dc_rand() * 84;
		$thu_cac_y = $thu_cac_dc_rand() * 116;
		$thu_cac_s = 60 + $thu_cac_dc_rand() * 100;
		// None starts under the header (top 14 lvh at scroll 0): seen refracted through its glass, a ring would cut
		// through the nav like a glitch. Bubbles near the top stay small.
	} while ( ( $thu_cac_dc_in_hero( $thu_cac_x, $thu_cac_y - 20, $thu_cac_s ) || ( $thu_cac_y - 20 ) < 14 ) && ++$thu_cac_try < 60 );
	if ( $thu_cac_y - 20 < 30 ) {
		$thu_cac_s = min( $thu_cac_s, 110 );
	}
	$thu_cac_t        = 9 + $thu_cac_dc_rand() * 7;
	$thu_cac_dc_orbs .= sprintf(
		'<i class="dc-p dc-orb dc-orb--%s%s" style="--x:%.1F%%;--y:%.1Flvh;--k:%.2F;--s:%dpx;--t:%.1Fs;--dl:-%.1Fs;--m:20lvh"><b></b></i>',
		array( 'a', 'b', 'c', 'd' )[ $thu_cac_i % 4 ],
		$thu_cac_dc_in_hero_m( $thu_cac_y - 20 ) ? ' dc-in-hero-m' : '',
		$thu_cac_x,
		$thu_cac_y,
		.35 + $thu_cac_dc_rand() * .25,
		$thu_cac_s,
		$thu_cac_t,
		$thu_cac_dc_rand() * $thu_cac_t
	);
}

/* ---- Tumbling story pages. ---- */
$thu_cac_dc_pages = '';
$thu_cac_dc_rand  = thu_cac_decor_rng( 57 );
for ( $thu_cac_i = 0; $thu_cac_i < 5; $thu_cac_i++ ) {
	$thu_cac_try = 0;
	do {
		$thu_cac_x = 3 + $thu_cac_dc_rand() * 94;
		$thu_cac_y = $thu_cac_dc_rand() * 116;
		$thu_cac_s = 18 + $thu_cac_dc_rand() * 12;
	} while ( $thu_cac_dc_in_hero( $thu_cac_x, $thu_cac_y - 8, $thu_cac_s ) && ++$thu_cac_try < 60 );
	$thu_cac_t         = 18 + $thu_cac_dc_rand() * 16;
	$thu_cac_dc_pages .= sprintf(
		'<i class="dc-p dc-page%s" style="--x:%.1F%%;--y:%.1Flvh;--k:%.2F;--s:%dpx;--t:%.1Fs;--dl:-%.1Fs;--r0:%ddeg;--dx:%dpx"><svg viewBox="0 0 26 34"><use href="#dc-page"/></svg></i>',
		$thu_cac_dc_in_hero_m( $thu_cac_y - 8 ) ? ' dc-in-hero-m' : '',
		$thu_cac_x,
		$thu_cac_y,
		.30 + $thu_cac_dc_rand() * .15,
		$thu_cac_s,
		$thu_cac_t,
		$thu_cac_dc_rand() * $thu_cac_t,
		-18 + $thu_cac_dc_rand() * 40,
		( 0 === $thu_cac_i % 2 ? 1 : -1 ) * ( 16 + $thu_cac_dc_rand() * 24 )
	);
}

/* ---- Sparkles (twinkling four-point stars). ---- */
$thu_cac_dc_tws  = '';
$thu_cac_dc_rand = thu_cac_decor_rng( 73 );
for ( $thu_cac_i = 0; $thu_cac_i < 14; $thu_cac_i++ ) {
	$thu_cac_try = 0;
	do {
		$thu_cac_x = 2 + $thu_cac_dc_rand() * 96;
		$thu_cac_y = $thu_cac_dc_rand() * 116;
		$thu_cac_s = 7 + $thu_cac_dc_rand() * 9;
	} while ( $thu_cac_dc_in_hero( $thu_cac_x, $thu_cac_y - 8, $thu_cac_s ) && ++$thu_cac_try < 60 );
	$thu_cac_t       = 3.2 + $thu_cac_dc_rand() * 4.3;
	$thu_cac_dc_tws .= sprintf(
		'<i class="dc-p dc-tw dc-tw--%s%s%s" style="--x:%.1F%%;--y:%.1Flvh;--k:%.2F;--s:%dpx;--t:%.1Fs;--dl:-%.1Fs"><b></b></i>',
		array( 'a', 'b', 'c', 'd' )[ ( $thu_cac_i + intdiv( $thu_cac_i, 4 ) ) % 4 ],
		0 === $thu_cac_i % 4 ? ' dc-tw--flash' : '',
		$thu_cac_dc_in_hero_m( $thu_cac_y - 8 ) ? ' dc-in-hero-m' : '',
		$thu_cac_x,
		$thu_cac_y,
		.12 + ( $thu_cac_s - 7 ) / 9 * .18,
		$thu_cac_s,
		$thu_cac_t,
		$thu_cac_dc_rand() * $thu_cac_t
	);
}

/* ---- Flying stars: comets falling down-left across the whole screen, the plain look's answer to the bats and the
   snow. Hidden over the hero headline (they fade in once it is scrolled away); a pure extra with reduced motion. ---- */
$thu_cac_dc_flys = '';
$thu_cac_dc_rand = thu_cac_decor_rng( 83 );
// Start columns (% of the width; they drift left by 28 lvh on the way down): most paths cross a side gutter, where
// the sky is open, the others glow through the blocks. The first eight (all a phone shows) cover both sides and the
// middle. Sixteen on wider screens.
$thu_cac_dc_cols = array( 6, 100, 50, 18, 108, 78, 12, 96, 30, 113, 64, 24, 3, 104, 21, 110 );
for ( $thu_cac_i = 0; $thu_cac_i < 16; $thu_cac_i++ ) {
	$thu_cac_t    = 14 + $thu_cac_dc_rand() * 12;
	$thu_cac_edge = $thu_cac_i < 8 && 0 === $thu_cac_i % 2;
	$thu_cac_dc_flys .= sprintf(
		// dc-fly--edge: on phones it falls straight down a side gutter (--xe), hugging the blocks' glass like a
		// sparkler. dc-fly--tz: its path crosses the page title on inner pages, so it waits for a little scroll there.
		'<i class="dc-fly dc-fly--%s%s%s" style="--x:%.1F%%;%s--s:%dpx;--t:%.1Fs;--dl:-%.1Fs;--r:%ddeg"><b></b></i>',
		array( 'a', 'b', 'c' )[ $thu_cac_i % 3 ],
		$thu_cac_edge ? ' dc-fly--edge' : '',
		$thu_cac_dc_cols[ $thu_cac_i ] < 66 ? ' dc-fly--tz' : '',
		$thu_cac_dc_cols[ $thu_cac_i ] - 2.5 + $thu_cac_dc_rand() * 5,
		$thu_cac_edge ? ( 0 === $thu_cac_i % 4 ? '--xe:8px;' : '--xe:calc(100% - 8px);' ) : '',
		10 + $thu_cac_dc_rand() * 8,
		$thu_cac_t,
		// Spread evenly over the cycle (with a little jitter), so the stream never bunches up or goes quiet.
		fmod( ( $thu_cac_i * 7 % 16 ) / 16 + $thu_cac_dc_rand() * .05, 1 ) * $thu_cac_t,
		(int) ( $thu_cac_dc_rand() * 90 )
	);
}

/* ---- Cloud sea: two strips of three 1440-unit periods (seamless drift on any screen up to 2880px). ---- */
$thu_cac_dc_clouds = static function ( $seed, $top_min, $top_max, $r_min, $r_max ) {
	$rand   = thu_cac_decor_rng( $seed );
	$shapes = array();
	for ( $i = 0; $i < 20; $i++ ) {
		$r        = $r_min + $rand() * ( $r_max - $r_min );
		$shapes[] = array( $i * 72 + $rand() * 30, $top_min + $rand() * ( $top_max - $top_min ) + $r, $r );
	}
	$circles = '';
	foreach ( array( 0, 1440, 2880 ) as $dx ) {
		foreach ( $shapes as $c ) {
			$circles .= sprintf( '<circle cx="%.1F" cy="%.1F" r="%.1F"/>', $c[0] + $dx, $c[1], $c[2] );
		}
	}
	return $circles;
};
$thu_cac_dc_back  = $thu_cac_dc_clouds( 91, 10, 60, 50, 90 );
$thu_cac_dc_front = $thu_cac_dc_clouds( 97, 90, 110, 30, 60 ); // Just below the rail (y 87): the tram rides on a cloud bank.
$thu_cac_dc_poles = '';
for ( $thu_cac_i = 0; $thu_cac_i < 6; $thu_cac_i++ ) {
	$thu_cac_x         = 300 + $thu_cac_i * 720;
	$thu_cac_dc_poles .= sprintf( '<rect x="%1$d" y="44" width="3" height="96" rx="1"/><rect x="%2$d" y="63.5" width="22" height="3" rx="1.5"/>', $thu_cac_x, $thu_cac_x - 19 );
}

/* ---- Shooting stars (night), kept to the right of the hero headline. ---- */
$thu_cac_dc_shoot = '';
foreach ( array( array( 90, 6, -28, 19, 4 ), array( 76, 30, -33, 27, 11 ), array( 98, 18, -36, 37, 17 ) ) as $thu_cac_i => $thu_cac_v ) {
	$thu_cac_dc_shoot .= sprintf( '<i class="dc-shoot dc-shoot--%d dc-night%s" style="--x:%d%%;--y:%dlvh;--a:%ddeg;--t:%ds;--dl:%ds"></i>', $thu_cac_i + 1, 2 === $thu_cac_i ? ' dc-shoot--warm' : '', $thu_cac_v[0], $thu_cac_v[1], $thu_cac_v[2], $thu_cac_v[3], $thu_cac_v[4] );
}

// Constellation stars: a soft halo and a small bright core at each point.
$thu_cac_dc_stars = static function ( $points ) {
	$halos = '';
	$cores = '';
	foreach ( $points as $p ) {
		$halos .= sprintf( '<circle cx="%.1F" cy="%.1F" r="5"/>', $p[0], $p[1] );
		$cores .= sprintf( '<circle cx="%.1F" cy="%.1F" r="1.6"/>', $p[0], $p[1] );
	}
	return '<g class="dc-c-halos">' . $halos . '</g><g class="dc-c-stns">' . $cores . '</g>';
};

$thu_cac_dc_spark = '<path d="M0-10C.9-3.2 3.2-.9 10 0 3.2.9.9 3.2 0 10-.9 3.2-3.2.9-10 0-3.2-.9-.9-3.2 0-10z"/>';
?>
<svg class="dc-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
	<symbol id="dc-spark" viewBox="-10 -10 20 20"><?php echo $thu_cac_dc_spark; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed SVG markup. ?></symbol>
	<symbol id="dc-page" viewBox="0 0 26 34"><rect class="dc-page__sheet" width="26" height="34" rx="4"/><path class="dc-page__ink" d="M6 10h14M6 16h14M6 22h9"/></symbol>
	<symbol id="dc-plane" viewBox="0 0 32 21"><path class="dc-plane__body" d="M0 8L32 0 21 21 15 13z"/><path class="dc-plane__fold" d="M15 13L32 0"/></symbol>
	<linearGradient id="dc-tram-grad"><stop offset="0" stop-color="#5b6cff"/><stop offset=".55" stop-color="#9a4dff"/><stop offset="1" stop-color="#ff5fa2"/></linearGradient>
	<linearGradient id="dc-beam" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".6"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></linearGradient>
	<linearGradient id="dc-ribbon"><stop offset="0" stop-color="#5b6cff"/><stop offset=".55" stop-color="#9a4dff"/><stop offset="1" stop-color="#ff5fa2" stop-opacity=".2"/></linearGradient>
	<linearGradient id="dc-line-grad" x1="0" y1="0" x2="66" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--dc-line-a)"/><stop offset=".5" style="stop-color:var(--dc-line-b)"/><stop offset="1" style="stop-color:var(--dc-line-c)"/></linearGradient>
	<pattern id="dc-pat-far" width="480" height="480" patternUnits="userSpaceOnUse"><?php echo $thu_cac_dc_far; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?></pattern>
	<pattern id="dc-pat-mid" width="560" height="560" patternUnits="userSpaceOnUse"><?php echo $thu_cac_dc_mid; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?></pattern>
	<pattern id="dc-pat-near" width="1120" height="1120" patternUnits="userSpaceOnUse"><?php echo $thu_cac_dc_near; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?></pattern>
</defs></svg>
<i class="dc-milky dc-night"></i><i class="dc-rays dc-day"></i>
<svg class="dc-field dc-field--far" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#dc-pat-far)"/></svg>
<svg class="dc-field dc-field--mid" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#dc-pat-mid)"/></svg>
<svg class="dc-field dc-field--near" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#dc-pat-near)"/></svg>
<div class="dc-consts">
	<?php // The "2D" monogram, drawn like a star chart: two D's side by side (overlapping a little, like the logo), soft stars on a fine line, three bright ones, and the route's name beside them. ?>
	<i class="dc-p dc-const dc-const--2d" style="--k:.30;--m:18lvh"><svg viewBox="-6 -6 186 84" width="205" height="92" aria-hidden="true" focusable="false">
		<path class="dc-c-line" d="M0 0V60C24 60 40 47 40 30S24 0 0 0ZM32 0V60C56 60 72 47 72 30S56 0 32 0Z"/>
		<?php echo $thu_cac_dc_stars( array( array( 0, 0 ), array( 29, 8.6 ), array( 40, 30 ), array( 29, 51.4 ), array( 0, 60 ), array( 32, 0 ), array( 61, 8.6 ), array( 72, 30 ), array( 61, 51.4 ), array( 32, 60 ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?>
		<g class="dc-c-bright"><use href="#dc-spark" x="-5" y="-5" width="10" height="10"/><use href="#dc-spark" x="34" y="24" width="12" height="12"/><use href="#dc-spark" x="66" y="24" width="12" height="12"/></g>
		<text class="dc-c-label" x="84" y="34">TRUYỆN 2D</text>
		<g class="dc-bead" transform="translate(0 0)"><circle class="dc-bead__halo" r="7"/><circle class="dc-bead__core" r="2.6"/></g>
	</svg></i>
	<i class="dc-p dc-const dc-const--tram" style="--x:calc((50% - 620px) / 2 - 62px);--y:128lvh;--k:.30;--m:18lvh"><svg viewBox="-12 -8 120 76" width="120" height="76" aria-hidden="true" focusable="false">
		<path class="dc-c-line dc-c-line--dash" d="M-10 0H110"/>
		<path class="dc-c-line" d="M0 20H96V52H0ZM40 20L48 4 56 20"/>
		<?php echo $thu_cac_dc_stars( array( array( 0, 20 ), array( 96, 20 ), array( 96, 52 ), array( 0, 52 ), array( 48, 4 ), array( 20, 60 ), array( 76, 60 ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?>
		<g class="dc-c-bright"><use href="#dc-spark" x="43" y="-1" width="10" height="10"/></g>
		<g class="dc-bead" transform="translate(0 20)"><circle class="dc-bead__halo" r="7"/><circle class="dc-bead__core" r="2.6"/></g>
	</svg></i>
</div>
<div class="dc-orbs"><?php echo $thu_cac_dc_orbs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?></div>
<div class="dc-pages"><?php echo $thu_cac_dc_pages; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?></div>
<div class="dc-tws"><?php echo $thu_cac_dc_tws; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?></div>
<div class="dc-flys"><?php echo $thu_cac_dc_flys; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?></div>
<div class="dc-sea">
	<svg class="dc-sea__strip dc-sea__strip--back" viewBox="0 0 4320 140" preserveAspectRatio="none" aria-hidden="true" focusable="false">
		<g class="dc-sea__rim" transform="translate(0 -2)"><?php echo $thu_cac_dc_back; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?></g>
		<g class="dc-sea__fill"><?php echo $thu_cac_dc_back; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?><rect y="100" width="4320" height="40"/></g>
		<g class="dc-sea__pole"><?php echo $thu_cac_dc_poles; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?></g>
	</svg>
	<svg class="dc-sea__wire" aria-hidden="true" focusable="false">
		<line class="dc-sea__cat" x1="0" y1="65" x2="100%" y2="65"/>
		<line class="dc-sea__rail" x1="0" y1="87" x2="100%" y2="87"/>
		<line class="dc-sea__ties" x1="0" y1="91" x2="100%" y2="91"/>
	</svg>
	<div class="dc-minitram"><svg class="dc-minitram__bob" viewBox="0 0 70 22" width="70" height="22" aria-hidden="true" focusable="false">
		<polygon class="dc-night" points="3,12 3,16 -40,26 -40,2" fill="url(#dc-beam)"/>
		<path class="dc-minitram__panto" d="M30 4l5-4 5 4"/>
		<rect y="4" width="70" height="16" rx="6" fill="url(#dc-tram-grad)"/>
		<rect x="6" y="5.5" width="58" height="1.6" rx=".8" fill="#fff" opacity=".4"/>
		<g class="dc-minitram__win"><rect x="12" y="7" width="9" height="6" rx="2"/><rect x="25" y="7" width="9" height="6" rx="2"/><rect x="38" y="7" width="9" height="6" rx="2"/><rect x="51" y="7" width="9" height="6" rx="2"/></g>
		<circle cx="3" cy="14" r="1.6" fill="#fff"/>
		<rect class="dc-minitram__bogie" x="8" y="19.5" width="16" height="2.5" rx="1.25"/><rect class="dc-minitram__bogie" x="46" y="19.5" width="16" height="2.5" rx="1.25"/>
	</svg></div>
	<svg class="dc-sea__strip dc-sea__strip--front" viewBox="0 0 4320 140" preserveAspectRatio="none" aria-hidden="true" focusable="false">
		<g class="dc-sea__rim" transform="translate(0 -2)"><?php echo $thu_cac_dc_front; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?></g>
		<g class="dc-sea__fill"><?php echo $thu_cac_dc_front; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?><rect y="126" width="4320" height="240"/></g>
	</svg>
</div>
<div class="dc-events">
	<?php echo $thu_cac_dc_shoot; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with sprintf. ?>
	<i class="dc-plane dc-plane--1 dc-day" style="--y:11lvh;--t:34s;--dl:14s"><svg viewBox="0 0 32 21" aria-hidden="true" focusable="false"><use href="#dc-plane"/></svg></i>
	<i class="dc-plane dc-plane--2 dc-day" style="--y:84lvh;--t:46s;--dl:32s"><svg viewBox="0 0 32 21" aria-hidden="true" focusable="false"><use href="#dc-plane"/></svg></i>
	<i class="dc-crumb dc-crumb--1"></i><i class="dc-crumb dc-crumb--2"></i><i class="dc-crumb dc-crumb--3"></i><i class="dc-crumb dc-crumb--4"></i>
	<div class="dc-express">
		<div class="dc-express__night dc-night"><i class="dc-x-glow"></i><i class="dc-x-tail"></i><i class="dc-x-ion"></i><svg class="dc-x-tram" viewBox="0 0 44 18" width="44" height="18" aria-hidden="true" focusable="false">
			<path d="M24 1l4-5 4 5" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
			<rect y="1" width="44" height="16" rx="6" fill="url(#dc-tram-grad)"/>
			<rect x="6" y="3" width="34" height="2" rx="1" fill="#fff" opacity=".4"/>
			<rect x="12" y="5" width="7" height="6" rx="2" fill="#ffcf6e"/><rect x="21" y="5" width="7" height="6" rx="2" fill="#ffcf6e"/><rect x="30" y="5" width="7" height="6" rx="2" fill="#ffcf6e"/>
			<circle cx="2.5" cy="12" r="2" fill="#fff"/>
		</svg></div>
		<div class="dc-express__day dc-day"><svg viewBox="0 0 340 60" width="340" height="60" aria-hidden="true" focusable="false">
			<path d="M34 30C74 18 94 42 134 30S194 18 234 30 294 42 334 30" fill="none" stroke="url(#dc-ribbon)" stroke-width="5" stroke-linecap="round" opacity=".85"/>
			<path d="M34 30C74 18 94 42 134 30S194 18 234 30 294 42 334 30" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>
			<g transform="translate(44 6) scale(-1 1)"><use href="#dc-plane" width="18" height="11.8"/></g>
			<g transform="translate(48 40) scale(-1 1)"><use href="#dc-plane" width="18" height="11.8"/></g>
			<g transform="translate(30 22) scale(-1 1)"><use href="#dc-plane" width="30" height="19.7"/></g>
		</svg></div>
	</div>
</div>
