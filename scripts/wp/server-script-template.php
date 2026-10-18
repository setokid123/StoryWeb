<?php
/**
 * Template for a one-off script on the live site (Railway), run with scripts/wp/railway-php.sh. Copy it, change the
 * three marked parts, and keep the order: --dry first (read only, prints what would change), read the report, then
 * --apply (backs up the original texts to /tmp/sw-backup.json, which you download and keep, then writes).
 *
 *   RAILWAY_SSH=thu-cac-wp scripts/wp/railway-php.sh my-script.php --dry
 *   RAILWAY_SSH=thu-cac-wp scripts/wp/railway-php.sh my-script.php --apply
 *   ssh thu-cac-wp 'cat /tmp/sw-backup.json' > backup-YYYY-MM-DD.json && ssh thu-cac-wp 'rm -f /tmp/sw-backup.json'
 *
 * Rules: never print secrets (tokens, passwords, wp-config values); query with $wpdb->prepare; write post fields with
 * $wpdb->update so dates stay as they are, then clean_post_cache(). See docs/VAN_HANH_RAILWAY.md.
 *
 * @package StoryWeb
 */

if ( 'cli' !== PHP_SAPI ) {
	exit( 1 );
}

// The PHP CLI does not load wp-config-railway.php (only Apache does), so give WordPress the site address here, or
// home_url() falls back to the old domain stored in the database.
$_SERVER['HTTP_HOST'] = 'tramtruyen2d.up.railway.app';
define( 'WP_HOME', 'https://tramtruyen2d.up.railway.app' );
define( 'WP_SITEURL', 'https://tramtruyen2d.up.railway.app' );
require getenv( 'WP_PATH' ) ? getenv( 'WP_PATH' ) . '/wp-load.php' : '/var/www/html/wp-load.php';

global $wpdb;
$apply = in_array( '--apply', $argv, true );

// ---- 1. Which posts (read only) -------------------------------------------------------------------------------------
$ids = $wpdb->get_col(
	$wpdb->prepare(
		"SELECT ID FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish' AND post_content LIKE %s",
		'chapter',
		'%' . $wpdb->esc_like( 'TEXT TO FIND' ) . '%'
	)
);

// ---- 2. What changes (pure function: old text in, new text out) ----------------------------------------------------
$change = static function ( $text ) {
	return str_replace( 'TEXT TO FIND', 'REPLACEMENT', $text );
};

// ---- 3. Report, and write only with --apply ----------------------------------------------------------------------
$changed = array();
foreach ( $ids as $id ) {
	$old = (string) get_post_field( 'post_content', (int) $id );
	$new = $change( $old );
	if ( $new !== $old ) {
		$changed[ (int) $id ] = array( $old, $new );
	}
}
echo 'posts found: ', count( $ids ), ', would change: ', count( $changed ), "\n";
foreach ( array_slice( $changed, 0, 10, true ) as $id => list( $old, $new ) ) {
	echo '#', $id, ' ', mb_strlen( $old ), ' -> ', mb_strlen( $new ), " characters\n";
}

if ( $apply && $changed ) {
	$backup = array();
	foreach ( $changed as $id => list( $old ) ) {
		$backup[ $id ] = array( 'post_content' => $old );
	}
	file_put_contents( '/tmp/sw-backup.json', wp_json_encode( $backup, JSON_UNESCAPED_UNICODE ) );
	$written = 0;
	foreach ( $changed as $id => list( , $new ) ) {
		if ( false !== $wpdb->update( $wpdb->posts, array( 'post_content' => $new ), array( 'ID' => $id ) ) ) {
			clean_post_cache( $id );
			++$written;
		}
	}
	echo "APPLIED: {$written} posts. Download /tmp/sw-backup.json now, then delete it.\n";
}
