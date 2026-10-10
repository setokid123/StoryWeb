<?php
/**
 * Sets story covers (featured images) from the output of covers-to-webp.mjs, on the WordPress server:
 *
 *   su -s /bin/sh -c 'php attach-covers.php <dir with manifest.json and the .webp files> [max files]' www-data
 *
 * Run as the web server user, so wp-admin can later replace or delete the files. WP_PATH (default /var/www/html)
 * is the WordPress root. Stories that already have a cover are skipped: run it again until it reports 0 files.
 * One attachment per file, shared by every story listed for it; WordPress makes its thumbnail and medium sizes.
 *
 * @package StoryWeb
 */

if ( 'cli' !== PHP_SAPI ) {
	exit( 1 );
}
$storyweb_dir = rtrim( $argv[1] ?? '', '/' );
$storyweb_max = (int) ( $argv[2] ?? PHP_INT_MAX );
if ( ! is_file( "$storyweb_dir/manifest.json" ) ) {
	fwrite( STDERR, "usage: php attach-covers.php <dir with manifest.json> [max files]\n" );
	exit( 1 );
}
$_SERVER['HTTP_HOST'] = $_SERVER['HTTP_HOST'] ?? 'localhost';
require ( getenv( 'WP_PATH' ) ? getenv( 'WP_PATH' ) : '/var/www/html' ) . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';

$storyweb_admin = get_users( array( 'role' => 'administrator', 'number' => 1, 'orderby' => 'ID' ) );
wp_set_current_user( $storyweb_admin ? $storyweb_admin[0]->ID : 0 );

$storyweb_stats = array( 'files' => 0, 'stories' => 0, 'had_cover' => 0, 'not_found' => 0, 'errors' => 0 );
$storyweb_t     = microtime( true );
foreach ( json_decode( file_get_contents( "$storyweb_dir/manifest.json" ), true ) as $storyweb_entry ) {
	if ( $storyweb_stats['files'] >= $storyweb_max ) {
		break;
	}
	$storyweb_stories = array();
	foreach ( $storyweb_entry['slugs'] as $storyweb_slug ) {
		$storyweb_story = get_page_by_path( sanitize_title( $storyweb_slug ), OBJECT, 'story' );
		if ( ! $storyweb_story ) {
			++$storyweb_stats['not_found'];
		} elseif ( has_post_thumbnail( $storyweb_story ) ) {
			++$storyweb_stats['had_cover'];
		} else {
			$storyweb_stories[] = $storyweb_story;
		}
	}
	if ( ! $storyweb_stories ) {
		continue;
	}

	$storyweb_file = sanitize_file_name( basename( $storyweb_entry['file'] ) );
	$storyweb_bits = wp_upload_bits( $storyweb_file, null, file_get_contents( "$storyweb_dir/$storyweb_file" ) );
	if ( $storyweb_bits['error'] ) {
		++$storyweb_stats['errors'];
		echo "$storyweb_file: {$storyweb_bits['error']}\n";
		continue;
	}
	$storyweb_id = wp_insert_attachment(
		array(
			'post_mime_type' => 'image/webp',
			'post_title'     => $storyweb_stories[0]->post_title,
			'post_status'    => 'inherit',
		),
		$storyweb_bits['file'],
		$storyweb_stories[0]->ID,
		true
	);
	if ( is_wp_error( $storyweb_id ) ) {
		++$storyweb_stats['errors'];
		echo "$storyweb_file: {$storyweb_id->get_error_message()}\n";
		wp_delete_file( $storyweb_bits['file'] );
		continue;
	}
	wp_update_attachment_metadata( $storyweb_id, wp_generate_attachment_metadata( $storyweb_id, $storyweb_bits['file'] ) );
	foreach ( $storyweb_stories as $storyweb_story ) {
		set_post_thumbnail( $storyweb_story, $storyweb_id );
		++$storyweb_stats['stories'];
	}
	++$storyweb_stats['files'];
}
printf( "%s in %.1fs\n", wp_json_encode( $storyweb_stats ), microtime( true ) - $storyweb_t );
