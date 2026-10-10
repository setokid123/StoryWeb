<?php
/**
 * Mã truyện (StoryWeb Core inc/story-code.php) for the stories already on the site, on the WordPress server:
 *
 *   su -s /bin/sh -c 'php assign-story-codes.php [--apply|--renumber|--remove]' www-data
 *
 *   (none)      dry run: what would change, nothing written
 *   --apply     published stories without a code get the next codes, oldest first (by ID)
 *   --renumber  every published story is numbered again from TT2D1, oldest first (first run on a site)
 *   --remove    codes, title prefixes and code slugs removed, old slugs back, counter reset (undo)
 *
 * Titles and slugs (links become /truyen/tt2d1/) are written straight to the database: the stories' "updated"
 * time and the home page order do not change. Old links redirect (the previous slug is kept as _wp_old_slug).
 * WP_PATH (default /var/www/html) is the WordPress root.
 *
 * @package StoryWeb
 */

if ( 'cli' !== PHP_SAPI ) {
	exit( 1 );
}
$storyweb_mode = in_array( '--remove', $argv, true ) ? 'remove' : ( in_array( '--renumber', $argv, true ) ? 'renumber' : ( in_array( '--apply', $argv, true ) ? 'apply' : 'dry' ) );
$_SERVER['HTTP_HOST'] = $_SERVER['HTTP_HOST'] ?? 'localhost';
if ( ! defined( 'ABSPATH' ) ) {
	require ( getenv( 'WP_PATH' ) ? getenv( 'WP_PATH' ) : '/var/www/html' ) . '/wp-load.php';
}
if ( ! function_exists( 'storyweb_set_story_code' ) ) {
	fwrite( STDERR, "StoryWeb Core with inc/story-code.php is not active\n" );
	exit( 1 );
}

global $wpdb;
$storyweb_ids = array_map( 'intval', $wpdb->get_col( "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'story' AND post_status = 'publish' ORDER BY ID ASC" ) );
$storyweb_log = array();

if ( 'remove' === $storyweb_mode ) {
	$storyweb_n = 0;
	foreach ( $wpdb->get_col( "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'story'" ) as $storyweb_id ) {
		$storyweb_post    = get_post( (int) $storyweb_id );
		$storyweb_code    = storyweb_story_code( $storyweb_post );
		$storyweb_changes = array();
		$storyweb_title   = storyweb_title_without_code( $storyweb_post->post_title );
		if ( $storyweb_title !== $storyweb_post->post_title ) {
			$storyweb_changes['post_title'] = $storyweb_title;
		}
		// Back to the slug it had before its code; the code slug stays as an old slug, so code links keep working.
		$storyweb_olds = storyweb_story_old_slugs( $storyweb_post );
		if ( '' !== $storyweb_code && strtolower( $storyweb_code ) === $storyweb_post->post_name && $storyweb_olds ) {
			$storyweb_back                   = end( $storyweb_olds );
			$storyweb_changes['post_name']   = $storyweb_back;
			delete_post_meta( $storyweb_post->ID, '_wp_old_slug', $storyweb_back );
			add_post_meta( $storyweb_post->ID, '_wp_old_slug', $storyweb_post->post_name );
		}
		if ( $storyweb_changes ) {
			$wpdb->update( $wpdb->posts, $storyweb_changes, array( 'ID' => $storyweb_post->ID ) );
			clean_post_cache( $storyweb_post->ID );
			++$storyweb_n;
		}
		delete_post_meta( $storyweb_post->ID, STORYWEB_META_CODE );
	}
	delete_option( STORYWEB_CODE_NEXT_OPTION );
	echo "removed codes from {$storyweb_n} titles\n";
	exit( 0 );
}

$storyweb_next = 'renumber' === $storyweb_mode ? 1 : storyweb_code_next_number();
$storyweb_done = 0;
foreach ( $storyweb_ids as $storyweb_id ) {
	$storyweb_has = storyweb_story_code( $storyweb_id );
	if ( 'renumber' !== $storyweb_mode && '' !== $storyweb_has ) {
		// Already coded: only make sure the title carries it.
		if ( 'apply' === $storyweb_mode ) {
			storyweb_set_story_code( $storyweb_id, $storyweb_has );
		}
		continue;
	}
	if ( $storyweb_next > 99999 ) {
		fwrite( STDERR, "out of codes at story {$storyweb_id}\n" );
		break;
	}
	$storyweb_code = storyweb_code_format( $storyweb_next++ );
	if ( count( $storyweb_log ) < 5 ) {
		$storyweb_log[] = $storyweb_code . STORYWEB_CODE_SEP . storyweb_title_without_code( get_post( $storyweb_id )->post_title );
	}
	if ( 'dry' !== $storyweb_mode ) {
		storyweb_set_story_code( $storyweb_id, $storyweb_code );
	}
	++$storyweb_done;
}
if ( 'dry' !== $storyweb_mode ) {
	update_option( STORYWEB_CODE_NEXT_OPTION, $storyweb_next, false );
}
echo implode( "\n", $storyweb_log ), "\n";
printf( "%s: %d of %d published stories %s; next code %s\n", $storyweb_mode, $storyweb_done, count( $storyweb_ids ), 'dry' === $storyweb_mode ? 'would get a code' : 'coded', storyweb_code_format( $storyweb_next ) );
