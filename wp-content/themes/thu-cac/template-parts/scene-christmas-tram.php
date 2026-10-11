<?php
/**
 * Giáng sinh on the tram of the home scene (template-parts/scene.php, inside the tram group so it moves with it):
 * snow along the whole roof (a static shade under it, no filter: the tram never stops moving), fairy lights (static
 * halos by night), a wreath on the door, a Santa hat on the pantograph (its pompom bounces once the tram has stopped)
 * and, in window 3, two readers sharing a book by candlelight, a quiet nod to the two Ds.
 * Styles: assets/css/season-christmas.css.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;
?>
<g class="sc-xmas-tram">
	<defs><clipPath id="sc-win3"><rect x="146" y="26" width="52" height="34" rx="10"/></clipPath></defs>
	<g class="sc-readers" clip-path="url(#sc-win3)">
		<path d="M165 40a5 5 0 1 1-10 0a5 5 0 1 1 10 0ZM188 41a5 5 0 1 1-10 0a5 5 0 1 1 10 0ZM149 61C149 52 153.5 47.5 160 47.5C163.6 47.5 166.2 49 167.8 51.4L171 49.6L174.4 51.8C176.2 49.8 179 48.6 183 48.6C189 48.6 193 52.6 193 61ZM163.4 55.6L171 50.4L178.6 55.6L178.6 57.4L171 52.6L163.4 57.4Z"/>
		<ellipse class="sc-flame" cx="171" cy="45" rx="1.4" ry="2.4"/>
	</g>
	<path class="sc-snowcap__sh" d="M8 3c-2-6 4-10 12-9 6-6 16-5 22-1 8-5 18-4 24 0 7-4 17-4 23 1 8-4 18-3 24 2 5-2 9-2 12-1h40c4-2 9-2 13 0 7-5 17-5 23 0 8-4 18-4 24 1 7-4 17-3 23 1 8-4 18-3 22 2 7-4 17-4 23 0 8-4 18-4 24 0 7-4 17-3 23 0 7-4 15-3 18 1 6-2 10 1 10 5v2H8z" transform="translate(0 1.8)"/>
	<path class="sc-snowcap" d="M8 3c-2-6 4-10 12-9 6-6 16-5 22-1 8-5 18-4 24 0 7-4 17-4 23 1 8-4 18-3 24 2 5-2 9-2 12-1h40c4-2 9-2 13 0 7-5 17-5 23 0 8-4 18-4 24 1 7-4 17-3 23 1 8-4 18-3 22 2 7-4 17-4 23 0 8-4 18-4 24 0 7-4 17-3 23 0 7-4 15-3 18 1 6-2 10 1 10 5v2H8z"/>
	<path class="sc-wire-lights" d="M16 3Q45 12 74 3Q103 12 132 3Q161 12 190 3Q219 12 248 3Q277 12 306 3Q335 12 364 3"/>
	<g class="sc-bulbs__halos"><circle cx="30.5" cy="12.9" r="7"/><circle cx="59.5" cy="12.9" r="7"/><circle cx="88.5" cy="12.9" r="7"/><circle cx="117.5" cy="12.9" r="7"/><circle cx="146.5" cy="12.9" r="7"/><circle cx="175.5" cy="12.9" r="7"/><circle cx="204.5" cy="12.9" r="7"/><circle cx="233.5" cy="12.9" r="7"/><circle cx="262.5" cy="12.9" r="7"/><circle cx="291.5" cy="12.9" r="7"/><circle cx="320.5" cy="12.9" r="7"/><circle cx="349.5" cy="12.9" r="7"/></g>
	<g class="sc-bulbs"><g class="sc-bulb sc-bulb--r" style="--b:0"><rect x="28.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="30.5" cy="12.9" rx="3.2" ry="4.4"/></g><g class="sc-bulb sc-bulb--y" style="--b:1"><rect x="57.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="59.5" cy="12.9" rx="3.2" ry="4.4"/></g><g class="sc-bulb sc-bulb--g" style="--b:2"><rect x="86.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="88.5" cy="12.9" rx="3.2" ry="4.4"/></g><g class="sc-bulb sc-bulb--b" style="--b:3"><rect x="115.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="117.5" cy="12.9" rx="3.2" ry="4.4"/></g><g class="sc-bulb sc-bulb--r" style="--b:4"><rect x="144.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="146.5" cy="12.9" rx="3.2" ry="4.4"/></g><g class="sc-bulb sc-bulb--y" style="--b:5"><rect x="173.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="175.5" cy="12.9" rx="3.2" ry="4.4"/></g><g class="sc-bulb sc-bulb--g" style="--b:6"><rect x="202.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="204.5" cy="12.9" rx="3.2" ry="4.4"/></g><g class="sc-bulb sc-bulb--b" style="--b:7"><rect x="231.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="233.5" cy="12.9" rx="3.2" ry="4.4"/></g><g class="sc-bulb sc-bulb--r" style="--b:8"><rect x="260.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="262.5" cy="12.9" rx="3.2" ry="4.4"/></g><g class="sc-bulb sc-bulb--y" style="--b:9"><rect x="289.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="291.5" cy="12.9" rx="3.2" ry="4.4"/></g><g class="sc-bulb sc-bulb--g" style="--b:10"><rect x="318.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="320.5" cy="12.9" rx="3.2" ry="4.4"/></g><g class="sc-bulb sc-bulb--b" style="--b:11"><rect x="347.5" y="6.4" width="4" height="3" rx="1"/><ellipse cx="349.5" cy="12.9" rx="3.2" ry="4.4"/></g></g>
	<g class="sc-wreath" transform="translate(354 46)"><circle r="8.5"/><path class="sc-wreath__bow" d="M0 7l-6 5 1-6zM0 7l6 5-1-6z"/><circle class="sc-wreath__berry" cx="-5" cy="-5" r="1.6"/><circle class="sc-wreath__berry" cx="6" cy="-2" r="1.6"/></g>
	<g class="sc-hat" transform="translate(180 -24)">
		<path class="sc-hat__body" d="M-8.6 5C-8.2-2-4.2-7.2 1.8-7.8C6.4-8.2 9.6-5.8 10.6-1.6C8.2-2.9 5.6-2.4 4.8-.4C5.6 1.4 6.4 3.3 7 5Z"/>
		<path class="sc-hat__fold" d="M4.8-.4C5.6 1.4 6.4 3.3 7 5L3 5C3.2 2.6 3.8.9 4.8-.4Z"/>
		<rect class="sc-hat__brim" x="-10" y="4" width="20" height="5" rx="2.5"/>
		<circle class="sc-hat__pom" cx="10.6" cy="-1.4" r="2.6"/>
	</g>
</g>
