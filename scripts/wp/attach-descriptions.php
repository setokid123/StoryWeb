<?php
/**
 * Sets story descriptions from descriptions-to-json.mjs, on the WordPress server:
 *
 *   su -s /bin/sh -c 'php attach-descriptions.php <descriptions.json> [--force]' www-data
 *
 * Only stories whose description (post content) is empty are filled, unless --force: a description written in
 * wp-admin is kept. The content is written directly, so the story's "updated" time and the latest-updated order on
 * the home page do not change. WP_PATH (default /var/www/html) is the WordPress root. Safe to run again.
 *
 * @package StoryWeb
 */

if ( 'cli' !== PHP_SAPI ) {
	exit( 1 );
}
$storyweb_file  = $argv[1] ?? '';
$storyweb_force = in_array( '--force', $argv, true );
if ( ! is_file( $storyweb_file ) ) {
	fwrite( STDERR, "usage: php attach-descriptions.php <descriptions.json> [--force]\n" );
	exit( 1 );
}
$_SERVER['HTTP_HOST'] = $_SERVER['HTTP_HOST'] ?? 'localhost';
if ( ! defined( 'ABSPATH' ) ) {
	require ( getenv( 'WP_PATH' ) ? getenv( 'WP_PATH' ) : '/var/www/html' ) . '/wp-load.php';
}

$storyweb_descriptions = json_decode( (string) file_get_contents( $storyweb_file ), true );
if ( ! is_array( $storyweb_descriptions ) ) {
	fwrite( STDERR, "not a JSON object\n" );
	exit( 1 );
}

global $wpdb;
$storyweb_stats = array( 'set' => 0, 'had_description' => 0, 'not_found' => 0 );
foreach ( $storyweb_descriptions as $storyweb_slug => $storyweb_text ) {
	$storyweb_story = get_page_by_path( sanitize_title( (string) $storyweb_slug ), OBJECT, 'story' );
	if ( ! $storyweb_story ) {
		++$storyweb_stats['not_found'];
		continue;
	}
	if ( ! $storyweb_force && '' !== trim( wp_strip_all_tags( $storyweb_story->post_content ) ) ) {
		++$storyweb_stats['had_description'];
		continue;
	}
	// Plain-text paragraphs separated by blank lines; the theme shows them with wpautop(). Same escaping as the
	// WXR importer.
	$storyweb_content = str_replace( array( '&', '<', '>' ), array( '&amp;', '&lt;', '&gt;' ), trim( (string) $storyweb_text ) );
	$wpdb->update( $wpdb->posts, array( 'post_content' => $storyweb_content ), array( 'ID' => $storyweb_story->ID ) );
	clean_post_cache( $storyweb_story->ID );
	++$storyweb_stats['set'];
}

printf(
	"descriptions set: %d, kept (already had one): %d, story not found: %d\n",
	$storyweb_stats['set'],
	$storyweb_stats['had_description'],
	$storyweb_stats['not_found']
);
