<?php
/**
 * Halloween in the home scene (template-parts/scene.php): storm, fog, bats from the moon (now with craters and
 * drifting cloud strips), spider, ghost, pumpkins on candle pools, ghost riders in the tram windows (a cat in the
 * middle one), and a witch with her cat crossing above the ticket now and then. Styles: assets/css/season-halloween.css.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;
?>
<g class="sc-halloween">
	<defs>
		<radialGradient id="sc-fog"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
		<radialGradient id="sc-pumpkin" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffb347"/><stop offset=".6" stop-color="#f76707"/><stop offset="1" stop-color="#b8430a"/></radialGradient>
		<radialGradient id="sc-hw-pool"><stop offset="0" stop-color="#ffaa3c" stop-opacity=".55"/><stop offset="1" stop-color="#ffaa3c" stop-opacity="0"/></radialGradient>
		<linearGradient id="sc-hw-wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset="1" stop-color="#ffb347"/></linearGradient>
		<pattern id="sc-hw-win" patternContentUnits="objectBoundingBox" width="1" height="1">
			<rect width="1" height="1" fill="url(#sc-hw-wing)"/>
			<path class="sc-hw-rider" d="M.33 1V.5C.33.36.41.26.5.26S.67.36.67.5V.93Q.61 1.03.555.94Q.5 1.03.445.94Q.39 1.03.33.93Z"/>
			<ellipse class="sc-hw-rider__eye" cx=".44" cy=".52" rx=".035" ry=".07"/><ellipse class="sc-hw-rider__eye" cx=".56" cy=".52" rx=".035" ry=".07"/>
		</pattern>
		<pattern id="sc-hw-win-cat" patternContentUnits="objectBoundingBox" width="1" height="1">
			<rect width="1" height="1" fill="url(#sc-hw-wing)"/>
			<path class="sc-hw-rider" d="M.33 1V.46L.36.24.45.37H.55L.64.24.67.46V1Z"/>
			<ellipse class="sc-hw-rider__eye" cx=".44" cy=".55" rx=".035" ry=".07"/><ellipse class="sc-hw-rider__eye" cx=".56" cy=".55" rx=".035" ry=".07"/>
		</pattern>
		<symbol id="sc-bat" viewBox="0 0 64 28"><path d="M32 10c2-4 4-5 4-5l1 4c3-1 6 0 8 2 3-5 10-8 19-6-5 2-8 6-8 10-4-2-9-1-12 2-2-3-6-4-9-2-3-2-7-1-9 2-3-3-8-4-12-2 0-4-3-8-8-10 9-2 16 1 19 6 2-2 5-3 8-2l1-4s2 1 4 5z"/></symbol>
		<symbol id="sc-jack" viewBox="0 0 100 86">
			<path class="sc-jack__stem" d="M47 14c0-6 2-11 8-13l3 4c-4 2-5 5-5 10z"/>
			<ellipse cx="30" cy="50" rx="26" ry="32" fill="url(#sc-pumpkin)"/>
			<ellipse cx="70" cy="50" rx="26" ry="32" fill="url(#sc-pumpkin)"/>
			<ellipse cx="50" cy="50" rx="24" ry="35" fill="url(#sc-pumpkin)"/>
			<path class="sc-jack__face" d="M30 40l10-9 7 10zM70 40l-10-9-7 10zM46 50h8l-4 7zM24 60q26 22 52 0l-7 3-5-5-6 6-5-6-6 6-5-6-6 6-5-5z"/>
		</symbol>
		<!-- A witch on her broom, flying left: bent hat, scarf, cat on the bristle end. -->
		<symbol id="sc-hw-witch" viewBox="0 0 120 64" overflow="visible">
			<path class="sc-hw-scarf" d="M51 21q11-4 25-1-11 1.5-24 4.5z"/>
			<path class="sc-hw-scarf" d="M52 23.5q11 1.5 21 7.5-11-2.5-21.5-4.5z"/>
			<path d="M3 46.6L98 40.6l.6 2.9-95 6z"/>
			<path d="M95 39l22-10q-5 13 2 27L95 45.6z"/>
			<path d="M50 18q7 8 14 25l7 4-35-2q8-15 14-27z"/>
			<path d="M48 23l-18.5 19.8 2.5 2.2L50.5 26.5z"/>
			<path d="M45 44.5l-2 8.5-7.5 1.5q-.5-2 2-2.5l3-.5 1-7z"/>
			<circle cx="49" cy="17" r="4.6"/>
			<path d="M45 16l-3.6 2.6 3.8.6z"/>
			<path d="M53 13q7 3 11 9-6-2-12-4z"/>
			<path d="M37 12.5q12-3 25-.5-12 2.6-25 .5z"/>
			<path d="M43 11.8l7.5-9.6q3.5-2.7 10-1-5.7 1.4-6.3 5.3l1.8 5.3z"/>
			<ellipse cx="86" cy="36.6" rx="6" ry="4.2"/>
			<circle cx="81.5" cy="32.2" r="3.4"/>
			<path d="M78.8 30.5l.2-3.9 2.4 2.6zM82.6 29.2l2-2.4.4 3.8z"/>
			<path d="M91 36q4-3 3-10-.5-2 1.5-2.5 1.5 1.5.5 3.5.5 7-4 11z"/>
		</symbol>
	</defs>
	<g class="sc-storm"><rect class="sc-flash" x="-20" y="-20" width="1480" height="760"/><path class="sc-bolt" d="M640 0l-34 82h26l-40 98 64-122h-28l36-58z"/></g>
	<g class="sc-hw-moon" style="--d:-5px">
		<circle cx="1060" cy="175" r="20"/><circle cx="1150" cy="250" r="28"/><circle cx="1122" cy="140" r="11"/>
		<!-- Two small clouds drifting over the moon's cap (the part the ticket leaves visible). -->
		<g class="sc-hw-strip sc-hw-strip--a"><path d="M1010 106H1182Q1192 106 1190 98Q1188 89 1176 90Q1172 78 1158 80Q1150 68 1132 72Q1118 62 1100 72Q1084 68 1076 80Q1060 78 1054 90Q1040 86 1032 94Q1018 92 1014 100Q1004 102 1010 106Z"/><path class="sc-hw-strip__rim" d="M1190 98Q1188 89 1176 90Q1172 78 1158 80Q1150 68 1132 72Q1118 62 1100 72Q1084 68 1076 80Q1060 78 1054 90Q1040 86 1032 94Q1018 92 1014 100"/></g>
		<g class="sc-hw-strip sc-hw-strip--b"><path d="M1156 84H1244Q1252 84 1250 78Q1247 71 1238 73Q1234 64 1222 66Q1214 56 1200 62Q1188 58 1182 68Q1170 66 1166 74Q1156 74 1156 80Z"/><path class="sc-hw-strip__rim" d="M1250 78Q1247 71 1238 73Q1234 64 1222 66Q1214 56 1200 62Q1188 58 1182 68Q1170 66 1166 74Q1156 74 1156 80"/></g>
	</g>
	<g class="sc-hw-witch">
		<use class="sc-hw-witch__fig" href="#sc-hw-witch" x="1180" y="38" width="120" height="64"/>
		<use class="sc-hw-witch__spark" href="#sc-spark" x="1301" y="69" width="10" height="10"/>
		<use class="sc-hw-witch__spark" href="#sc-spark" x="1318" y="79" width="7" height="7"/>
		<use class="sc-hw-witch__spark" href="#sc-spark" x="1332" y="66" width="8" height="8"/>
	</g>
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
	<g class="sc-hw-pools">
		<ellipse class="sc-hw-pool" style="--j:0" cx="88" cy="630" rx="77" ry="10"/>
		<ellipse class="sc-hw-pool" style="--j:1" cx="177" cy="634" rx="50" ry="10"/>
		<ellipse class="sc-hw-pool" style="--j:2" cx="728" cy="456" rx="45" ry="10"/>
	</g>
	<g class="sc-jacks">
		<use class="sc-jack" style="--j:0" href="#sc-jack" x="40" y="550" width="96" height="83"/>
		<use class="sc-jack" style="--j:1" href="#sc-jack" x="146" y="582" width="62" height="54"/>
		<use class="sc-jack" style="--j:2" href="#sc-jack" x="700" y="410" width="56" height="48"/>
	</g>
</g>
