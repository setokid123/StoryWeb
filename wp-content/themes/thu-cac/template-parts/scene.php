<?php
/**
 * "Sân ga trên mây": the home hero illustration, drawn for Trạm Truyện 2D. A dreamy illustrated sky (sun or moon,
 * power lines, flying pages, sparkles) and a tram arriving on a rail above the clouds. Colours come from CSS variables
 * (--sc-*), so it follows Sáng/Tối. Decorative only. Used once per page (ids are fixed).
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;
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
	<g class="sc-stars">
		<circle cx="160" cy="70" r="1.6"/><circle cx="330" cy="140" r="1.2"/><circle cx="470" cy="58" r="2"/><circle cx="610" cy="120" r="1.3"/>
		<circle cx="780" cy="44" r="1.7"/><circle cx="905" cy="300" r="1.2"/><circle cx="1260" cy="330" r="1.6"/><circle cx="1390" cy="250" r="1.3"/>
		<circle cx="1000" cy="64" r="1.4"/><circle cx="240" cy="260" r="1.1"/><circle cx="700" cy="330" r="1.5"/><circle cx="1360" cy="40" r="1.8"/>
	</g>
	<circle class="sc-ring" cx="1110" cy="210" r="188"/>
	<circle class="sc-ring sc-ring--dash" cx="1110" cy="210" r="240"/>
	<circle cx="1110" cy="210" r="142" fill="url(#sc-sun)"/>
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
			<g class="sc-brake"><use href="#sc-spark" x="30" y="86" width="16" height="16"/><use href="#sc-spark" x="132" y="90" width="10" height="10"/><use href="#sc-spark" x="236" y="87" width="13" height="13"/></g>
		</g></g>
	</g>
	<g class="sc-rail"><path d="M-20 644H1460"/><path class="sc-rail__ties" d="M-20 652H1460"/></g>

	<g class="sc-cloud" style="--d:-24px" fill="url(#sc-cloud)">
		<circle cx="30" cy="700" r="112"/><circle cx="170" cy="660" r="118"/><circle cx="320" cy="708" r="96"/><circle cx="440" cy="742" r="86"/>
		<circle cx="1470" cy="676" r="112"/><circle cx="1370" cy="724" r="84"/><circle cx="880" cy="770" r="96"/><circle cx="1010" cy="760" r="80"/>
	</g>

	<?php if ( function_exists( 'thu_cac_season' ) && 'halloween' === thu_cac_season() ) : ?>
	<g class="sc-halloween">
		<defs>
			<radialGradient id="sc-fog"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
			<radialGradient id="sc-pumpkin" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffb347"/><stop offset=".6" stop-color="#f76707"/><stop offset="1" stop-color="#b8430a"/></radialGradient>
			<symbol id="sc-bat" viewBox="0 0 64 28"><path d="M32 10c2-4 4-5 4-5l1 4c3-1 6 0 8 2 3-5 10-8 19-6-5 2-8 6-8 10-4-2-9-1-12 2-2-3-6-4-9-2-3-2-7-1-9 2-3-3-8-4-12-2 0-4-3-8-8-10 9-2 16 1 19 6 2-2 5-3 8-2l1-4s2 1 4 5z"/></symbol>
			<symbol id="sc-jack" viewBox="0 0 100 86">
				<path class="sc-jack__stem" d="M47 14c0-6 2-11 8-13l3 4c-4 2-5 5-5 10z"/>
				<ellipse cx="30" cy="50" rx="26" ry="32" fill="url(#sc-pumpkin)"/>
				<ellipse cx="70" cy="50" rx="26" ry="32" fill="url(#sc-pumpkin)"/>
				<ellipse cx="50" cy="50" rx="24" ry="35" fill="url(#sc-pumpkin)"/>
				<path class="sc-jack__face" d="M30 40l10-9 7 10zM70 40l-10-9-7 10zM46 50h8l-4 7zM24 60q26 22 52 0l-7 3-5-5-6 6-5-6-6 6-5-6-6 6-5-5z"/>
			</symbol>
		</defs>
		<g class="sc-storm"><rect class="sc-flash" x="-20" y="-20" width="1480" height="760"/><path class="sc-bolt" d="M640 0l-34 82h26l-40 98 64-122h-28l36-58z"/></g>
		<g class="sc-fog"><ellipse class="sc-fog__a" cx="420" cy="646" rx="560" ry="54" fill="url(#sc-fog)"/><ellipse class="sc-fog__b" cx="1080" cy="672" rx="600" ry="46" fill="url(#sc-fog)"/></g>
		<g class="sc-bats">
			<g class="sc-bat-burst" style="--fx:201px;--fy:191px"><use class="sc-bat sc-bat--a" href="#sc-bat" x="880" y="6" width="58" height="26"/></g>
			<g class="sc-bat-burst" style="--fx:58px;--fy:186px"><use class="sc-bat sc-bat--b" href="#sc-bat" x="1030" y="14" width="44" height="20"/></g>
			<g class="sc-bat-burst" style="--fx:-155px;--fy:-51px"><use class="sc-bat sc-bat--c" href="#sc-bat" x="1240" y="250" width="50" height="22"/></g>
			<g class="sc-bat-burst" style="--fx:130px;--fy:-129px"><use class="sc-bat sc-bat--d" href="#sc-bat" x="960" y="330" width="40" height="18"/></g>
		</g>
		<g class="sc-spider">
			<path class="sc-spider__thread" d="M700 185V250"/>
			<g class="sc-spider__body" transform="translate(700 254)">
				<path d="M-14-8l-8-6M-15-2h-10M-14 4l-8 7M14-8l8-6M15-2h10M14 4l8 7"/>
				<ellipse rx="10" ry="12"/><circle cy="-13" r="6"/>
			</g>
		</g>
		<g transform="translate(-164 -73)"><g class="sc-ghost">
			<path d="M760 420c0-40 26-66 58-66s58 26 58 66v58l-14-12-15 14-14-14-15 14-14-14-15 12z"/>
			<ellipse class="sc-ghost__eye" cx="800" cy="410" rx="7" ry="10"/><ellipse class="sc-ghost__eye" cx="836" cy="410" rx="7" ry="10"/>
			<ellipse class="sc-ghost__mouth" cx="818" cy="436" rx="8" ry="6"/>
		</g></g>
		<g class="sc-jacks">
			<use class="sc-jack" style="--j:0" href="#sc-jack" x="40" y="550" width="96" height="83"/>
			<use class="sc-jack" style="--j:1" href="#sc-jack" x="146" y="582" width="62" height="54"/>
			<use class="sc-jack" style="--j:2" href="#sc-jack" x="700" y="410" width="56" height="48"/>
		</g>
	</g>
	<?php endif; ?>
</svg>
