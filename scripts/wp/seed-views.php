<?php
/**
 * LOCAL TESTS ONLY: sample view counts for "Xem nhiều" (Post Views Counter's table), in the periods it writes.
 * TT2D3 leads this week (story page + 2 chapters = 23), TT2D1 is second (15), TT2D5 has the most views of all time
 * but none this month (40, "total" only). Run after setup-post-views.php:
 *   { "step": "runPHP", "code": "<?php require '/wordpress/wp-load.php'; require '/seed/seed-views.php';" }
 *
 * @package StoryWeb
 */

defined( 'ABSPATH' ) || exit;

global $wpdb;
$storyweb_table = $wpdb->prefix . 'post_views';
$storyweb_now   = (int) current_time( 'timestamp', true );
$storyweb_all   = array(
	0 => gmdate( 'Ymd', $storyweb_now ),
	1 => gmdate( 'oW', $storyweb_now ),
	2 => gmdate( 'Ym', $storyweb_now ),
	3 => gmdate( 'Y', $storyweb_now ),
	4 => 'total',
);
$storyweb_story = static function ( $code ) {
	return get_page_by_path( strtolower( $code ), OBJECT, 'story' );
};
$storyweb_add   = static function ( $post_id, $count, $types ) use ( $wpdb, $storyweb_table, $storyweb_all ) {
	foreach ( $types as $type ) {
		$wpdb->query(
			$wpdb->prepare(
				"INSERT INTO {$storyweb_table} (id, type, period, count) VALUES (%d, %d, %s, %d)",
				$post_id,
				$type,
				$storyweb_all[ $type ],
				$count
			)
		);
	}
};

$storyweb_s3 = $storyweb_story( 'TT2D3' );
$storyweb_s1 = $storyweb_story( 'TT2D1' );
$storyweb_s5 = $storyweb_story( 'TT2D5' );
if ( ! $storyweb_s3 || ! $storyweb_s1 || ! $storyweb_s5 ) {
	echo "seed-views: stories TT2D1/3/5 not found\n";
	return;
}
$storyweb_add( $storyweb_s3->ID, 5, array( 0, 1, 2, 3, 4 ) );
$storyweb_add( storyweb_find_chapter( $storyweb_s3->ID, 1 )->ID, 10, array( 0, 1, 2, 3, 4 ) );
$storyweb_add( storyweb_find_chapter( $storyweb_s3->ID, 2 )->ID, 8, array( 0, 1, 2, 3, 4 ) );
$storyweb_add( $storyweb_s1->ID, 15, array( 0, 1, 2, 3, 4 ) );
$storyweb_add( $storyweb_s5->ID, 40, array( 4 ) );
// Rankings cached before the views existed (pages loaded while the site was being set up).
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_%thu\\_cac\\_rank\\_%'" );
echo "seed-views: done\n";
