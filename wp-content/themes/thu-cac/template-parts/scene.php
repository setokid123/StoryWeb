<?php
/**
 * "Sân ga trên mây": the home hero illustration, drawn for Trạm Truyện 2D. A dreamy illustrated sky (sun or moon,
 * power lines, flying pages, sparkles) and a tram arriving on a rail above the clouds. Colours come from CSS variables
 * (--sc-*), so it follows Sáng/Tối. Seasonal dressing (inc/season.php): Halloween (bats, pumpkins, ghost, storm)
 * and Giáng sinh (snow, fairy lights on the tram, a tree by the rail, Santa's sleigh). Decorative only. Used once
 * per page (ids are fixed).
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

$thu_cac_season = function_exists( 'thu_cac_season' ) ? thu_cac_season() : '';
// A seasonal part, only if that exact file exists (get_template_part() would fall back to this very file).
$thu_cac_scene_part = static function ( $name ) {
	$file = locate_template( 'template-parts/scene-' . $name . '.php' );
	if ( $file ) {
		load_template( $file, false );
	}
};
?>
<svg class="scene" viewBox="0 0 1440 720" aria-hidden="true" focusable="false">
	<defs>
		<radialGradient id="sc-glow" cx="1110" cy="210" r="360" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--sc-glow);stop-opacity:.95"/><stop offset="1" style="stop-color:var(--sc-glow);stop-opacity:0"/></radialGradient>
		<radialGradient id="sc-sun" cx="1072" cy="164" r="190" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--sc-sun-a)"/><stop offset="1" style="stop-color:var(--sc-sun-b)"/></radialGradient>
		<linearGradient id="sc-cloud" x1="0" y1="560" x2="0" y2="760" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--sc-cloud-hi)"/><stop offset=".5" style="stop-color:var(--sc-cloud)"/><stop offset="1" style="stop-color:var(--sc-cloud-lo)"/></linearGradient>
		<linearGradient id="sc-cloud-far" x1="0" y1="470" x2="0" y2="700" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--sc-cloud-hi);stop-opacity:.75"/><stop offset="1" style="stop-color:var(--sc-cloud-lo);stop-opacity:.3"/></linearGradient>
		<linearGradient id="sc-wire" x1="160" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--sc-wire);stop-opacity:0"/><stop offset=".6" style="stop-color:var(--sc-wire);stop-opacity:.85"/><stop offset="1" style="stop-color:var(--sc-wire)"/></linearGradient>
		<linearGradient id="sc-tram" x1="0" y1="0" x2="380" y2="92" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5b6cff"/><stop offset=".55" stop-color="#9a4dff"/><stop offset="1" stop-color="#ff5fa2"/></linearGradient>
		<linearGradient id="sc-beam" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".75"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></linearGradient>
		<linearGradient id="sc-meteor" x1="0" y1="0" x2="110" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
		<symbol id="sc-spark" viewBox="-10 -10 20 20"><path d="M0-10C.9-3.2 3.2-.9 10 0 3.2.9.9 3.2 0 10-.9 3.2-3.2.9-10 0-3.2-.9-.9-3.2 0-10z"/></symbol>
		<symbol id="sc-page" viewBox="0 0 26 34"><rect class="sc-page__sheet" width="26" height="34" rx="4"/><path class="sc-page__ink" d="M6 10h14M6 16h14M6 22h9"/></symbol>
	</defs>

	<circle cx="1110" cy="210" r="360" fill="url(#sc-glow)"/>
	<g class="sc-sky" style="--d:-5px">
	<?php if ( ! $thu_cac_season ) : // Plain look: light shafts by day, moonbeams by night, all pointing up (tram.css 18). ?>
	<defs><radialGradient id="sc-raygrad" cx="1110" cy="210" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--sc-ray);stop-opacity:0"/><stop offset=".26" style="stop-color:var(--sc-ray);stop-opacity:0"/><stop offset=".30" style="stop-color:var(--sc-ray);stop-opacity:1"/><stop offset=".64" style="stop-color:var(--sc-ray);stop-opacity:0"/></radialGradient></defs>
	<g class="sc-rays" fill="url(#sc-raygrad)">
		<?php
		foreach ( array( -172 => 360, -152 => 430, -131 => 500, -110 => 470, -90 => 430, -70 => 470, -49 => 500, -28 => 430, -8 => 360 ) as $thu_cac_ray_a => $thu_cac_ray_l ) {
			$thu_cac_ray_1 = deg2rad( $thu_cac_ray_a - 2.2 );
			$thu_cac_ray_2 = deg2rad( $thu_cac_ray_a + 2.2 );
			printf( '<path d="M1110 210L%.1F %.1F %.1F %.1FZ"/>', 1110 + $thu_cac_ray_l * cos( $thu_cac_ray_1 ), 210 + $thu_cac_ray_l * sin( $thu_cac_ray_1 ), 1110 + $thu_cac_ray_l * cos( $thu_cac_ray_2 ), 210 + $thu_cac_ray_l * sin( $thu_cac_ray_2 ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numbers printed with %F.
		}
		?>
	</g>
	<?php endif; ?>
	<g class="sc-stars">
		<circle cx="160" cy="70" r="1.6"/><circle cx="330" cy="140" r="1.2"/><circle cx="470" cy="58" r="2"/><circle cx="610" cy="120" r="1.3"/>
		<circle cx="780" cy="44" r="1.7"/><circle cx="905" cy="300" r="1.2"/><circle cx="1260" cy="330" r="1.6"/><circle cx="1390" cy="250" r="1.3"/>
		<circle cx="1000" cy="64" r="1.4"/><circle cx="240" cy="260" r="1.1"/><circle cx="700" cy="330" r="1.5"/><circle cx="1360" cy="40" r="1.8"/>
	</g>
	<circle class="sc-ring" cx="1110" cy="210" r="188"/>
	<circle class="sc-ring sc-ring--dash" cx="1110" cy="210" r="240"/>
	<circle cx="1110" cy="210" r="142" fill="url(#sc-sun)"/>
	<?php if ( ! $thu_cac_season ) : ?>
	<circle class="sc-launch" cx="1110" cy="210" r="150"/>
	<?php endif; ?>
	<path class="sc-sun-shine" d="M1040 150a96 96 0 0 1 70-40"/>
	</g>

	<g class="sc-cloud-far" style="--d:-10px" fill="url(#sc-cloud-far)">
		<circle cx="520" cy="640" r="80"/><circle cx="620" cy="590" r="100"/><circle cx="750" cy="560" r="112"/><circle cx="880" cy="600" r="96"/><circle cx="990" cy="630" r="74"/>
		<circle cx="700" cy="680" r="110"/><circle cx="860" cy="700" r="100"/>
	</g>

	<g class="sc-pole">
		<rect x="1390" y="92" width="12" height="640" rx="3"/>
		<rect x="1336" y="124" width="104" height="8" rx="3"/>
		<rect x="1352" y="166" width="76" height="7" rx="3"/>
		<circle cx="1344" cy="120" r="5"/><circle cx="1432" cy="120" r="5"/><circle cx="1360" cy="162" r="4.5"/><circle cx="1420" cy="162" r="4.5"/>
	</g>
	<g class="sc-wire">
		<path d="M1344 120Q820 250-20 120"/>
		<path d="M1360 162Q840 300-20 178"/>
		<path d="M1432 120Q1446 122 1460 124"/>
		<path d="M1420 162Q1440 166 1460 168"/>
	</g>
	<path class="sc-catenary" d="M880 522H1460"/>

	<g class="sc-pages">
		<g class="sc-float sc-float--a"><use href="#sc-page" x="712" y="120" width="30" height="39" transform="rotate(-14 727 140)"/></g>
		<g class="sc-float sc-float--b"><use href="#sc-page" x="752" y="300" width="22" height="29" transform="rotate(12 763 314)"/></g>
		<g class="sc-float sc-float--c"><use href="#sc-page" x="640" y="40" width="18" height="24" transform="rotate(-26 649 52)"/></g>
	</g>
	<g class="sc-sparks">
		<use class="sc-twinkle" href="#sc-spark" x="880" y="96" width="22" height="22"/>
		<use class="sc-twinkle sc-twinkle--b" href="#sc-spark" x="1330" y="300" width="16" height="16"/>
		<use class="sc-twinkle sc-twinkle--c" href="#sc-spark" x="780" y="210" width="14" height="14"/>
		<use class="sc-twinkle" href="#sc-spark" x="560" y="16" width="12" height="12"/>
		<use class="sc-twinkle sc-twinkle--b" href="#sc-spark" x="960" y="430" width="18" height="18"/>
	</g>

	<g class="sc-visitors">
		<g transform="translate(830 26) rotate(154)"><g class="sc-meteor"><path d="M0 0H110" stroke="url(#sc-meteor)" stroke-width="2.4" stroke-linecap="round"/><circle cx="110" r="2.6" fill="#fff"/></g></g>
		<g transform="translate(470 118)"><g class="sc-plane"><path class="sc-plane__body" d="M0 8L32 0 21 21 15 13z"/><path class="sc-plane__fold" d="M15 13L32 0"/></g></g>
	</g>

	<g class="sc-tram-wrap" style="--d:-16px">
		<g transform="translate(1000 540)"><g class="sc-tram">
			<polygon class="sc-beam" points="9,64 9,84 -390,176 -390,-10" fill="url(#sc-beam)"/>
			<path class="sc-panto" d="M164 0l16-14 16 14M180-14v-4M168-18h24"/>
			<g transform="translate(180 -19)"><g class="sc-zap"><use href="#sc-spark" x="-16" y="-16" width="32" height="32"/><circle r="5"/></g></g>
			<rect width="380" height="92" rx="26" fill="url(#sc-tram)"/>
			<rect x="16" y="8" width="348" height="9" rx="4.5" fill="#fff" opacity=".38"/>
			<rect class="sc-window" style="--i:1" x="14" y="24" width="46" height="42" rx="16"/>
			<rect class="sc-window" style="--i:2" x="80" y="26" width="52" height="34" rx="10"/>
			<rect class="sc-window" style="--i:3" x="146" y="26" width="52" height="34" rx="10"/>
			<rect class="sc-window" style="--i:4" x="212" y="26" width="52" height="34" rx="10"/>
			<rect class="sc-window" style="--i:5" x="278" y="26" width="52" height="34" rx="10"/>
			<rect x="342" y="24" width="24" height="56" rx="8" fill="#fff" opacity=".2"/>
			<path class="sc-glint" d="M24 54l14-22M90 52l12-18M156 52l12-18M222 52l12-18M288 52l12-18"/>
			<rect x="12" y="70" width="320" height="12" rx="6" fill="#fff" opacity=".16"/>
			<text class="sc-plate" x="84" y="80">TRẠM TRUYỆN 2D</text>
			<circle class="sc-light" cx="9" cy="74" r="5"/>
			<rect class="sc-bogie" x="40" y="88" width="96" height="10" rx="5"/>
			<rect class="sc-bogie" x="244" y="88" width="96" height="10" rx="5"/>
			<?php $thu_cac_season && $thu_cac_scene_part( $thu_cac_season . '-tram' ); ?>
			<g class="sc-brake"><use href="#sc-spark" x="30" y="86" width="16" height="16"/><use href="#sc-spark" x="132" y="90" width="10" height="10"/><use href="#sc-spark" x="236" y="87" width="13" height="13"/></g>
		</g></g>
	</g>
	<g class="sc-rail"><path d="M-20 644H1460"/><path class="sc-rail__ties" d="M-20 652H1460"/></g>

	<g class="sc-cloud" style="--d:-24px" fill="url(#sc-cloud)">
		<circle cx="30" cy="700" r="112"/><circle cx="170" cy="660" r="118"/><circle cx="320" cy="708" r="96"/><circle cx="440" cy="742" r="86"/>
		<circle cx="1470" cy="676" r="112"/><circle cx="1370" cy="724" r="84"/><circle cx="880" cy="770" r="96"/><circle cx="1010" cy="760" r="80"/>
	</g>


	<?php $thu_cac_season && $thu_cac_scene_part( $thu_cac_season ); // Seasonal dressing: scene-<season>.php. ?>
</svg>
