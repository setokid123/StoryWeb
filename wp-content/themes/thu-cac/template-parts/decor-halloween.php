<?php
/**
 * Page-wide decoration for Halloween, "Ga nửa đêm" (the midnight ghost express). Printed by inc/decor.php inside
 * .sky, so it is fixed, behind every block, and absent on the reader page; styles in assets/css/season-halloween.css.
 *
 * Back to front: a night wash; far embers (Sáng) or stars (Tối) over static dust, drifting with the scroll; a back fog
 * band; a cut-paper horizon (tree, gravestones, fences, a witch-hat stop, a station lamp) at the foot of the screen;
 * the night: a big harvest moon rising off the right edge with cloud ribbons and an unmasked halo, and three times a
 * cycle the ghost express pulls in on a dashed rail, crosses the moon and departs while bats burst out of it (on the
 * home page only once the hero moon has scrolled away, and below 1640px restaged in the right gutter: a smaller moon,
 * the express docking at the blocks' edge, the bats streaming up and down the gutter; on phones it all runs above the
 * page head, behind and just under the header pill); ghosts rising out of the fog; the near field: big candle and
 * spirit glows that slide under the blocks' glass, and wisps (candle flames in Sáng); two lone bats; the front fog; a
 * corner web whose spider lowers on its thread as the page scrolls.
 *
 * Every silhouette is two copies of one symbol: an offset "cut" copy (a paper edge in Sáng, an orange rim light in
 * Tối) under the figure, both in one node. Positions come from thu_cac_decor_rng(), so the sky is the same on every
 * load. Numbers are printed with %F (never a locale decimal comma). Decorative only.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

// The four-point spark used by the far field and the express pantograph.
$thu_cac_hw_spark = 'M0-10C.9-3.2 3.2-.9 10 0 3.2.9.9 3.2 0 10-.9 3.2-3.2.9-10 0-3.2-.9-.9-3.2 0-10z';

// A figure: the cut copy, then the figure itself, in one <svg>.
$thu_cac_hw_fig = static function ( $symbol, $viewbox ) {
	return sprintf( '<svg viewBox="%2$s"><use class="hw-cut" href="#%1$s"/><use href="#%1$s"/></svg>', esc_attr( $symbol ), esc_attr( $viewbox ) );
};

// Corner web, anchored at (0,0): $angles radials and spiral rings that sag towards the corner.
$thu_cac_hw_web = static function () {
	$angles = array( 3, 17, 31, 45, 59, 73, 87 );
	$radii  = array( 24, 46, 70, 96, 124 );
	$pt     = static function ( $a, $r ) {
		return array( $r * cos( deg2rad( $a ) ), $r * sin( deg2rad( $a ) ) );
	};
	$d      = '';
	foreach ( $angles as $a ) {
		list( $x, $y ) = $pt( $a, 200 );
		$d            .= sprintf( 'M0 0L%.1F %.1F', $x, $y );
	}
	$dew = '';
	foreach ( $radii as $k => $base ) {
		$r = array();
		foreach ( $angles as $j => $a ) {
			$r[ $j ] = $base + $j * 1.4;
		}
		list( $x, $y ) = $pt( $angles[0], $r[0] );
		$d            .= sprintf( 'M%.1F %.1F', $x, $y );
		$last          = count( $angles ) - 1;
		for ( $j = 0; $j < $last; $j++ ) {
			list( $qx, $qy ) = $pt( ( $angles[ $j ] + $angles[ $j + 1 ] ) / 2, ( $r[ $j ] + $r[ $j + 1 ] ) / 2 * .88 );
			list( $x, $y )   = $pt( $angles[ $j + 1 ], $r[ $j + 1 ] );
			$d              .= sprintf( 'Q%.1F %.1F %.1F %.1F', $qx, $qy, $x, $y );
		}
		// Dew where some rings cross a radial.
		foreach ( array( array( 1, 2 ), array( 2, 5 ), array( 3, 1 ), array( 3, 4 ), array( 4, 3 ), array( 0, 4 ) ) as $p ) {
			if ( $p[0] === $k ) {
				list( $x, $y ) = $pt( $angles[ $p[1] ], $r[ $p[1] ] );
				$dew          .= sprintf( '<circle class="hwd-dew" cx="%.1F" cy="%.1F" r="1.6"/>', $x, $y );
			}
		}
	}
	return '<path class="hwd-web" d="' . esc_attr( $d ) . '"/>' . $dew;
};

// A cloud ribbon across the moon (x -120 to 420, centred on it): a flat base under a row of round puffs of mixed
// sizes with flat stretches between, rounded at both ends; plus its rim along the top. Same shape on every load.
$thu_cac_hw_ribbon = static function ( $c, $h, $seed ) {
	$rand = thu_cac_decor_rng( $seed );
	$b    = $c + $h / 2;
	$yb   = $c - $h * .1; // where the puffs sit
	$x0   = -120 + $h * .6;
	$x    = $x0;
	$end  = 420 - $h * .6;
	$arcs = '';
	while ( $x < $end - $h * .5 ) {
		if ( $rand() < .3 ) { // a flat stretch
			$x     = min( $end, $x + $h * ( .8 + $rand() * 1.6 ) );
			$arcs .= sprintf( 'L%.1F %.1F', $x, $yb );
			continue;
		}
		$r = $h * ( .5 + $rand() * .75 );
		$l = min( $r * 1.85, $end - $x );
		if ( $l < $h * .5 ) {
			break;
		}
		$r     = max( $r, $l / 2 + .1 );
		$x    += $l;
		$arcs .= sprintf( 'A%.1F %.1F 0 0 1 %.1F %.1F', $r, $r, $x, $yb );
	}
	$x     = max( $x, $end );
	$arcs .= sprintf( 'L%.1F %.1F', $x, $yb );
	return sprintf(
		'<path d="M-120 %1$.1FQ-120 %2$.1F %3$.1F %2$.1F%4$sQ420 %2$.1F 420 %1$.1FZ"/><path class="hw-ribbon__rim" d="M%3$.1F %2$.1F%4$s"/>',
		$b,
		$yb,
		$x0,
		$arcs
	);
};

/* ---------- Far field: 14 stars (embers in Sáng) and 2 sparks per tile; the tile is printed twice. Two stars twinkle,
   one more shines steadily with a halo; static dust fills the tile behind them (CSS) ---------- */
$thu_cac_rand = thu_cac_decor_rng( 1031 );
$thu_cac_far  = '';
$thu_cac_tw   = array(
	3 => array( 3.4, 1.2 ),
	7 => array( 5.1, 3.8 ),
);
for ( $thu_cac_i = 1; $thu_cac_i <= 14; $thu_cac_i++ ) {
	$thu_cac_x = 1 + $thu_cac_rand() * 98;
	$thu_cac_y = 1 + $thu_cac_rand() * 98;
	$thu_cac_s = 1.5 + $thu_cac_rand() * 1.5;
	$thu_cac_o = .5 + $thu_cac_rand() * .4;
	if ( isset( $thu_cac_tw[ $thu_cac_i ] ) ) {
		$thu_cac_far .= sprintf( '<i class="hw-star hw-star--t" style="left:%.1F%%;top:%.1F%%;--s:%.1Fpx;--o:%.2F;--td:%.1Fs;--tdl:-%.1Fs"></i>', $thu_cac_x, $thu_cac_y, $thu_cac_s, $thu_cac_o, $thu_cac_tw[ $thu_cac_i ][0], $thu_cac_tw[ $thu_cac_i ][1] );
	} elseif ( 11 === $thu_cac_i ) {
		$thu_cac_far .= sprintf( '<i class="hw-star hw-star--b" style="left:%.1F%%;top:%.1F%%;--s:%.1Fpx;--o:%.2F"></i>', $thu_cac_x, $thu_cac_y, $thu_cac_s, $thu_cac_o );
	} else {
		$thu_cac_far .= sprintf( '<i class="hw-star" style="left:%.1F%%;top:%.1F%%;--s:%.1Fpx;--o:%.2F"></i>', $thu_cac_x, $thu_cac_y, $thu_cac_s, $thu_cac_o );
	}
}
for ( $thu_cac_i = 0; $thu_cac_i < 2; $thu_cac_i++ ) {
	$thu_cac_far .= sprintf( '<svg class="hw-spark" style="left:%.1F%%;top:%.1F%%"><use href="#hwd-spark"/></svg>', 8 + $thu_cac_i * 50 + $thu_cac_rand() * 38, 6 + $thu_cac_rand() * 86 );
}

/* ---------- Near field: 2 big glows per tile (candle light and spirit light, behind the blocks' glass: they slide
   under every block as the page scrolls), then 6 wisps (2 in the left gutter, 4 on the right half) ---------- */
$thu_cac_rand = thu_cac_decor_rng( 1041 );
$thu_cac_near = '';
for ( $thu_cac_i = 0; $thu_cac_i < 2; $thu_cac_i++ ) {
	// One in the upper left half of the tile, one in the lower right half, so they never clump.
	$thu_cac_near .= sprintf(
		'<i class="hw-glow%s" style="left:%.1F%%;top:%.1F%%"></i>',
		1 === $thu_cac_i ? ' hw-glow--alt' : '',
		10 + $thu_cac_i * 38 + $thu_cac_rand() * 32,
		10 + $thu_cac_i * 44 + $thu_cac_rand() * 36
	);
}
$thu_cac_rand = thu_cac_decor_rng( 1037 );
for ( $thu_cac_i = 0; $thu_cac_i < 6; $thu_cac_i++ ) {
	$thu_cac_left = in_array( $thu_cac_i, array( 0, 4 ), true );
	$thu_cac_x    = $thu_cac_left ? .5 + $thu_cac_rand() * 5.5 : 46 + $thu_cac_rand() * 53;
	$thu_cac_near .= sprintf(
		'<i class="hw-wisp%s" style="left:%.1F%%;top:%.1F%%;--w:%.1Fpx;--wd:%.1Fs;--wdl:-%.1Fs"></i>',
		2 === $thu_cac_i % 3 ? ' hw-wisp--alt' : '',
		$thu_cac_x,
		5 + $thu_cac_rand() * 90,
		12 + $thu_cac_rand() * 14,
		14 + $thu_cac_rand() * 12,
		$thu_cac_rand() * 26
	);
}

/* ---------- The burst: 8 bats fanning out of the moon (left, up and down-left). --ux is the flight's horizontal
   share (its cosine), for the home page's narrow-gutter burst, where the swarm streams up and down the gutter ---------- */
$thu_cac_rand  = thu_cac_decor_rng( 1031 );
$thu_cac_burst = '';
for ( $thu_cac_i = 0; $thu_cac_i < 8; $thu_cac_i++ ) {
	$thu_cac_a      = deg2rad( 100 + ( $thu_cac_i + $thu_cac_rand() ) / 8 * 170 ); // spread evenly, with jitter
	$thu_cac_d      = 70 + $thu_cac_rand() * 45;
	$thu_cac_burst .= sprintf(
		'<span class="hw-bat" style="--tx:%.1Fvw;--ty:%.1Fvh;--ux:%.2F;--r:%.1Fdeg;--s:%.2F;--i:%d">%s</span>',
		cos( $thu_cac_a ) * $thu_cac_d,
		sin( $thu_cac_a ) * $thu_cac_d * .8,
		cos( $thu_cac_a ),
		( $thu_cac_rand() - .5 ) * 40,
		1 + $thu_cac_rand() * .8,
		$thu_cac_i,
		$thu_cac_hw_fig( 'hwd-bat', '0 0 64 28' )
	);
}

/* ---------- Ghost lanes (left jitter ±1%); A's lane hugs the blocks' left edge and B's the right one (CSS) ---------- */
$thu_cac_rand = thu_cac_decor_rng( 1033 );
$thu_cac_jit  = static function ( $x ) use ( $thu_cac_rand ) {
	return $x + ( $thu_cac_rand() * 2 - 1 );
};
$thu_cac_ghosts = sprintf(
	'<span class="hw-ghost hw-ghost--a"><span class="hw-ghost__in">%s</span></span>'
	. '<span class="hw-ghost hw-ghost--b"><span class="hw-ghost__in">%s</span></span>'
	. '<span class="hw-ghost hw-ghost--c" style="--gx:%.1F%%"><span class="hw-ghost__in">%s</span></span>'
	. '<span class="hw-ghost hw-ghost--d" style="--gx:%.1F%%"><span class="hw-ghost__in">%s</span></span>',
	$thu_cac_hw_fig( 'hwd-ghost', '0 0 100 110' ),
	$thu_cac_hw_fig( 'hwd-ghost-lantern', '0 0 128 120' ),
	$thu_cac_jit( 68 ),
	$thu_cac_hw_fig( 'hwd-ghost', '0 0 100 110' ),
	$thu_cac_jit( 56 ),
	$thu_cac_hw_fig( 'hwd-ghost', '0 0 100 110' )
);

// A crooked picket fence for the horizon: $n pointed posts from $x0, each leaning its own way, on two rails (all
// filled, so the cut copy follows the outline exactly). The ground line is at y 88.
$thu_cac_hw_fence = static function ( $x0, $n, $seed ) {
	$rand = thu_cac_decor_rng( $seed );
	$d    = '';
	$x    = $x0;
	for ( $i = 0; $i < $n; $i++ ) {
		$x    = $x0 + $i * 21 + ( $rand() - .5 ) * 4;
		$top  = 56 + $rand() * 9;
		$tilt = deg2rad( ( $rand() - .5 ) * 13 );
		$pts  = array( array( -2.6, 0 ), array( -2.6, $top + 5 - 88 ), array( 0, $top - 88 ), array( 2.6, $top + 5 - 88 ), array( 2.6, 0 ) );
		foreach ( $pts as $k => $p ) {
			$d .= sprintf( '%s%.1F %.1F', 0 === $k ? 'M' : 'L', $x + $p[0] * cos( $tilt ) - $p[1] * sin( $tilt ), 88 + $p[0] * sin( $tilt ) + $p[1] * cos( $tilt ) );
		}
		$d .= 'Z';
	}
	$x1 = $x0 - 9;
	$x2 = $x + 9;
	$d .= sprintf( 'M%1$.1F 67L%2$.1F 68.6L%2$.1F 70.8L%1$.1F 69.2ZM%1$.1F 78.4L%2$.1F 77.6L%2$.1F 79.8L%1$.1F 80.6Z', $x1, $x2 );
	return '<path d="' . esc_attr( $d ) . '"/>';
};

// Passengers in the express windows 2, 3 (a cat) and 5: x is the window's left edge.
$thu_cac_rider = static function ( $x, $cat = false ) {
	$c = $x + 15;
	$body = $cat
		? sprintf( 'M%1$.1F 44V35.5l1.3-4.3 2.6 2.8h2.2l2.6-2.8 1.3 4.3V44z', $c - 5 )
		: sprintf( 'M%1$.1F 44V36a5 5 0 0 1 10 0v8l-2.5-2.2-2.5 2.2-2.5-2.2z', $c - 5 );
	return sprintf( '<path class="hwd-rider" d="%s"/><circle class="hwd-eye" cx="%.1F" cy="37" r=".8"/><circle class="hwd-eye" cx="%.1F" cy="37" r=".8"/>', esc_attr( $body ), $c - 1.8, $c + 1.8 );
};

$thu_cac_bat_d   = 'M32 9L34.5 3.5 36.2 8.6Q39 9 41.2 10.8 50 4 63 4.4 59 9 58 15.4 53.5 12.6 49.6 17.6 45.4 15 41.4 19.6 38 17.4 35 19.6 33.6 22 32 22.4 30.4 22 29 19.6 26 17.4 22.6 19.6 18.6 15 14.4 17.6 10.5 12.6 6 15.4 5 9 1 4.4 14 4 22.8 10.8 25 9 27.8 8.6L29.5 3.5Z';
// Ghost: one outline (arms included, so nothing overlaps in the see-through Tối look). The right arm either waves
// or holds the lantern.
$thu_cac_ghost_d = static function ( $lantern ) {
	$right = $lantern ? 'C97 53 104 60 107 68C105 72 101 73 99 70C96 66 93 64 90 64' : 'C93 47 96 43 98 40C100 47 97 56 90 61';
	return '<path class="hwd-gbody" d="M50 6C75 6 90 25 90 50' . $right . 'V95q-10 14-20 2-10 12-20 0-10 12-20 0-10 12-20-2V61C3 56 0 47 2 40C4 43 7 47 10 50C10 25 25 6 50 6z"/>'
		. '<ellipse class="hwd-eye" cx="38" cy="47" rx="5" ry="7.5"/><ellipse class="hwd-eye" cx="62" cy="47" rx="5" ry="7.5"/>'
		. '<ellipse class="hwd-blush" cx="28" cy="60" rx="6.5" ry="3.2"/><ellipse class="hwd-blush" cx="72" cy="60" rx="6.5" ry="3.2"/>'
		. '<ellipse class="hwd-eye" cx="50" cy="63" rx="3.6" ry="4.6"/>';
};
?>
<svg class="hw-sprite" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
	<defs>
		<radialGradient id="hwd-pumpkin" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#f76707"/></radialGradient>
		<linearGradient id="hwd-win-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hw-win-a)"/><stop offset="1" style="stop-color:var(--hw-express-win)"/></linearGradient>
		<symbol id="hwd-spark" viewBox="-10 -10 20 20"><path d="<?php echo esc_attr( $thu_cac_hw_spark ); ?>"/></symbol>
		<symbol id="hwd-bat" viewBox="0 0 64 28"><path d="<?php echo esc_attr( $thu_cac_bat_d ); ?>"/></symbol>
		<symbol id="hwd-ghost" viewBox="0 0 100 110"><?php echo $thu_cac_ghost_d( false ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed SVG markup. ?></symbol>
		<symbol id="hwd-ghost-lantern" viewBox="0 0 128 120">
			<?php echo $thu_cac_ghost_d( true ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed SVG markup. ?>
			<path class="hwd-bail" d="M104 72q8 7 8 16"/>
			<rect x="110.8" y="85.6" width="2.6" height="4" rx="1" fill="#3f6b2a"/>
			<ellipse cx="106.5" cy="97" rx="6" ry="7.5" fill="url(#hwd-pumpkin)"/><ellipse cx="117.5" cy="97" rx="6" ry="7.5" fill="url(#hwd-pumpkin)"/><ellipse cx="112" cy="97" rx="6.5" ry="8.5" fill="url(#hwd-pumpkin)"/>
			<path class="hwd-jackface" d="M106.8 95.2l2.6-3.2 2 3.4zM117.2 95.2l-2.6-3.2-2 3.4zM106.4 99.4q5.6 5.2 11.2 0l-1.9 1.1-1.8-1.4-1.9 1.5-1.9-1.5-1.8 1.4z"/>
		</symbol>
		<symbol id="hwd-express" viewBox="0 0 240 72">
			<path class="hwd-panto" d="M108 13l12-11 12 11M120 2V0M111 0h18"/>
			<rect class="hwd-bogie" x="36" y="11" width="180" height="6" rx="3"/>
			<path class="hwd-xbody" d="M32 16h186q16 0 16 16v14q0 14-14 14H16Q6 60 6 50v-6Q8 16 32 16z"/>
			<g class="hwd-wins"><path d="M15 44Q16 27 31 24h18a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3z"/><rect x="64" y="24" width="30" height="20" rx="5"/><rect x="106" y="24" width="30" height="20" rx="5"/><rect x="148" y="24" width="30" height="20" rx="5"/><rect x="190" y="24" width="30" height="20" rx="5"/></g>
			<?php echo $thu_cac_rider( 64 ) . $thu_cac_rider( 106, true ) . $thu_cac_rider( 190 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from numbers. ?>
			<rect class="hwd-plate" x="40" y="50" width="150" height="3" rx="1.5"/>
			<circle class="hwd-lamp" cx="10" cy="47" r="2.6"/>
			<path class="hwd-bogie" d="M30 59h52v4H30zM158 59h52v4h-52z"/>
			<g class="hwd-wheels"><circle cx="41" cy="65.5" r="4.5"/><circle cx="71" cy="65.5" r="4.5"/><circle cx="169" cy="65.5" r="4.5"/><circle cx="199" cy="65.5" r="4.5"/></g>
		</symbol>
		<symbol id="hwd-web" viewBox="0 0 140 140"><?php echo $thu_cac_hw_web(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from numbers. ?></symbol>
		<radialGradient id="hwd-lampglow-g"><stop offset="0" style="stop-color:var(--hw-lamp);stop-opacity:.6"/><stop offset="1" style="stop-color:var(--hw-lamp);stop-opacity:0"/></radialGradient>
		<!-- The horizon, left end: a bare tree with a lit pumpkin at its foot, three gravestones, a crooked fence. -->
		<symbol id="hwd-sky-l" viewBox="0 0 420 90">
			<g stroke="none">
				<path d="M0 90V80Q34 74 70 78Q120 83 170 81Q230 78 290 82Q372 87 420 90Z"/>
				<path d="M54 89Q62 85 62.5 76H70.5Q71 85 80 89Z"/>
				<path transform="rotate(-6 162 87)" d="M150 87V67Q150 55 162 55Q174 55 174 67V87Z"/>
				<path transform="rotate(5 208 87)" d="M205 87V63H197V57H205V48H211V57H219V63H211V87Z"/>
				<path transform="rotate(3 249 87)" d="M240 87V73Q240 65 249 65Q258 65 258 73V87Z"/>
				<ellipse cx="95" cy="80.5" rx="6.2" ry="5.8"/><ellipse cx="105" cy="80.5" rx="6.2" ry="5.8"/><ellipse cx="100" cy="80" rx="6.6" ry="6.8"/>
				<path d="M99.2 73.6q.2-3 2.6-4.2l.9 1q-1.6 1.1-1.6 3.4z"/>
				<path class="hwd-lamp" d="M95.6 79l1.9-2.6 1.7 2.6zM104.4 79l-1.9-2.6-1.7 2.6zM95 81.8q5 4 10 0l-1.5.9-1.5-1.1-1.5 1.2-1.5-1.2-1.5 1.1z"/>
				<?php echo $thu_cac_hw_fence( 296, 6, 1051 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in the helper. ?>
			</g>
			<g fill="none" stroke-linecap="round" stroke-linejoin="round">
				<path stroke-width="9" d="M66.5 88Q65 74 67 62"/>
				<path stroke-width="6" d="M67 64Q69 52 66 42"/>
				<path stroke-width="3.6" d="M66 44Q64 34 68 24"/>
				<path stroke-width="3.4" d="M67 60Q80 56 90 44M66.5 54Q54 50 44 40M66 47Q76 41 82 28M66 40Q58 34 54 22"/>
				<path stroke-width="1.8" d="M90 44Q98 40 102 32M90 44Q97 46 104 44M44 40Q38 38 31 40M44 40Q42 32 36 28M82 28Q88 24 89 16M54 22Q50 16 52 9M68 24Q72 18 70 11M78 54Q84 54 88 58M56 48Q52 50 50 56"/>
			</g>
		</symbol>
		<!-- The horizon, right end: a crooked fence, a gravestone, a stop with a witch-hat roof, a station lamp. -->
		<symbol id="hwd-sky-r" viewBox="0 0 420 90">
			<circle class="hwd-lampglow" stroke="none" cx="356" cy="35" r="30"/>
			<g stroke="none">
				<path d="M0 90Q50 85 120 82Q190 77 260 80Q340 84 420 78V90Z"/>
				<?php echo $thu_cac_hw_fence( 18, 5, 1053 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in the helper. ?>
				<path transform="rotate(-4 155 87)" d="M146 87V71Q146 63 155 63Q164 63 164 71V87Z"/>
				<g class="hwd-stop">
					<path d="M207 87V58H211V87ZM279 87V58H283V87ZM214 75H276V78H214ZM218 78H221V87H218ZM269 78H272V87H269Z"/>
					<path d="M196 60Q245 51 294 60L292 63.5Q245 55.5 198 63.5Z"/>
					<path d="M214 57.5Q234 50 239 30Q242 17 263 7Q252 18 254 31Q257 48 276 57.5Q245 53 214 57.5Z"/>
				</g>
				<path d="M366 89L368.5 81H376.5L379 89ZM370.8 82V30H374.2V82Z"/>
				<path d="M349.5 28.5H362.5L360 25H352ZM351 29H361L359.4 41H352.6ZM352 41.5H360L359 43.5H353Z"/>
				<path class="hwd-lamp" d="M353 31H359L358 39.5H354Z"/>
			</g>
			<path fill="none" stroke-width="2.6" stroke-linecap="round" d="M372.5 32Q372.5 20 363 20Q356 20 356 25"/>
		</symbol>
	</defs>
</svg>
<div class="hw-wash"></div>
<div class="hw-far"><div class="hw-far__tile"><?php echo $thu_cac_far; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from numbers. ?></div><div class="hw-far__tile"><?php echo $thu_cac_far; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- same tile. ?></div></div>
<div class="hw-fog hw-fog--back"></div>
<div class="hw-skyline"><span class="hw-skyline__l"><?php echo $thu_cac_hw_fig( 'hwd-sky-l', '0 0 420 90' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in the helper. ?></span><span class="hw-skyline__r"><?php echo $thu_cac_hw_fig( 'hwd-sky-r', '0 0 420 90' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in the helper. ?></span></div>
<div class="hw-night">
	<span class="hw-moon-halo"></span>
	<div class="hw-moon">
		<svg class="hw-moon__svg" viewBox="0 0 300 300">
			<defs><radialGradient id="hwd-moon-g" cx=".4" cy=".36" r=".62"><stop offset="0" style="stop-color:var(--hw-moon-a)"/><stop offset=".55" style="stop-color:var(--hw-moon-b)"/><stop offset="1" style="stop-color:var(--hw-moon-c)"/></radialGradient><clipPath id="hwd-moon-clip"><circle cx="150" cy="150" r="122"/></clipPath></defs>
			<circle class="hw-moon__ring" cx="150" cy="150" r="146"/>
			<circle class="hw-moon__rim" cx="150" cy="150" r="122"/>
			<g class="hw-moon__face"><circle cx="150" cy="150" r="118" fill="url(#hwd-moon-g)"/><circle class="hw-moon__crater" cx="112" cy="104" r="18"/><circle class="hw-moon__crater" cx="176" cy="170" r="24"/><circle class="hw-moon__crater" cx="150" cy="88" r="9"/></g>
			<g clip-path="url(#hwd-moon-clip)">
			<g class="hw-ribbon hw-ribbon--1"><?php echo $thu_cac_hw_ribbon( 168, 12, 41 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from numbers. ?></g>
			<g class="hw-ribbon hw-ribbon--2"><?php echo $thu_cac_hw_ribbon( 206, 16, 42 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from numbers. ?></g>
			<g class="hw-ribbon hw-ribbon--3"><?php echo $thu_cac_hw_ribbon( 238, 10, 43 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from numbers. ?></g>
			</g>
		</svg>
	</div>
	<i class="hw-rail"></i>
	<div class="hw-express">
		<svg viewBox="0 0 240 72">
			<defs>
				<linearGradient id="hwd-mist-g" x1="0" x2="1"><stop offset="0" style="stop-color:var(--hw-mist)"/><stop offset="1" style="stop-color:var(--hw-mist);stop-opacity:0"/></linearGradient>
				<linearGradient id="hwd-beam-g" x1="1" x2="0"><stop offset="0" style="stop-color:var(--hw-beam)"/><stop offset="1" style="stop-color:var(--hw-beam);stop-opacity:0"/></linearGradient>
				<radialGradient id="hwd-glow-g"><stop offset="0" style="stop-color:var(--hw-express-glow)"/><stop offset="1" style="stop-color:var(--hw-express-glow);stop-opacity:0"/></radialGradient>
			</defs>
			<ellipse cx="124" cy="38" rx="220" ry="80" fill="url(#hwd-glow-g)"/>
			<ellipse cx="330" cy="40" rx="110" ry="18" fill="url(#hwd-mist-g)"/>
			<polygon points="6,44 -130,26 -130,72" fill="url(#hwd-beam-g)"/>
			<use class="hw-cut" href="#hwd-express"/><use href="#hwd-express"/>
			<g transform="translate(120 1) scale(.75)"><path class="hwd-zap" d="<?php echo esc_attr( $thu_cac_hw_spark ); ?>"/></g>
		</svg>
	</div>
	<div class="hw-burst"><?php echo $thu_cac_burst; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from numbers. ?></div>
</div>
<div class="hw-ghosts"><?php echo $thu_cac_ghosts; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from numbers. ?></div>
<div class="hw-near"><div class="hw-near__tile"><?php echo $thu_cac_near; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from numbers. ?></div><div class="hw-near__tile"><?php echo $thu_cac_near; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- same tile. ?></div></div>
<div class="hw-lone"><span class="hw-bat"><?php echo $thu_cac_hw_fig( 'hwd-bat', '0 0 64 28' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in the helper. ?></span><span class="hw-bat"><?php echo $thu_cac_hw_fig( 'hwd-bat', '0 0 64 28' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in the helper. ?></span></div>
<div class="hw-fog hw-fog--front"></div>
<svg class="hw-web hw-web--tl"><use href="#hwd-web"/></svg>
<i class="hw-thread"></i>
<svg class="hw-spider" viewBox="0 0 18 20"><path class="hw-spider__legs" d="M6.2 10.5Q2.6 6.4 1 8.8M5.6 12.3Q1.6 10.8 0 13.4M5.6 13.8Q1.6 14.8 1.1 18.4M6.6 15.4Q4.1 17.7 3.6 20M11.8 10.5Q15.4 6.4 17 8.8M12.4 12.3Q16.4 10.8 18 13.4M12.4 13.8Q16.4 14.8 16.9 18.4M11.4 15.4Q13.9 17.7 14.4 20"/><circle cx="9" cy="6.6" r="3"/><circle cx="9" cy="12.6" r="5"/><circle class="hw-spider__eye" cx="8" cy="6" r=".55"/><circle class="hw-spider__eye" cx="10" cy="6" r=".55"/></svg>
