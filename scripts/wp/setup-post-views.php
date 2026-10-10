<?php
/**
 * Settings for the Post Views Counter plugin (wordpress.org/plugins/post-views-counter): count story and chapter
 * pages, count with JavaScript (keeps working behind a page cache), and never print the plugin's own "Views:" line,
 * because the theme shows "lượt xem" itself (story page + its chapters). Same as Cài đặt → Post Views Counter.
 *
 * Playground: a blueprint runPHP step requires this file after wp-load.php.
 * Server (after activating the plugin): su -s /bin/sh -c 'php setup-post-views.php' www-data   (WP_PATH, default /var/www/html)
 *
 * @package StoryWeb
 */

if ( ! defined( 'ABSPATH' ) ) {
	if ( 'cli' !== PHP_SAPI ) {
		exit( 1 );
	}
	$_SERVER['HTTP_HOST'] = $_SERVER['HTTP_HOST'] ?? 'localhost';
	require ( getenv( 'WP_PATH' ) ? getenv( 'WP_PATH' ) : '/var/www/html' ) . '/wp-load.php';
}

if ( ! function_exists( 'pvc_get_post_views' ) ) {
	echo "Post Views Counter is not active: activate it first.\n";
	return;
}

$storyweb_general = get_option( 'post_views_counter_settings_general' );
$storyweb_general = is_array( $storyweb_general ) ? $storyweb_general : array();
$storyweb_general['post_types_count'] = array( 'story', 'chapter' );
$storyweb_general['counter_mode']     = 'js';
update_option( 'post_views_counter_settings_general', $storyweb_general );

$storyweb_display = get_option( 'post_views_counter_settings_display' );
$storyweb_display = is_array( $storyweb_display ) ? $storyweb_display : array();
$storyweb_display['post_types_display'] = array();
update_option( 'post_views_counter_settings_display', $storyweb_display );

echo "Post Views Counter: counts story + chapter pages (JavaScript), no automatic display.\n";
