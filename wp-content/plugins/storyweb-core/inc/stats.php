<?php
/**
 * Thống kê: daily counters for the unlock flow, plus the reading figures Post Views Counter already keeps.
 *
 * Our table {prefix}storyweb_stats holds one row per day, metric and item, nothing about the person (no IP, no
 * cookie): "gate" (a locked chapter showed the link gate; item = story ID), "click" (a reader's click on the gate
 * granted access; item = story ID), "link" (which unlock link was opened; item = the link) and "refused" (a
 * /mo-khoa/ request turned down; item = reason). Days are UTC, like Post Views Counter's, so the charts line up.
 * Rows older than STORYWEB_STATS_KEEP_DAYS are deleted once a day.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

const STORYWEB_STATS_DB_VERSION = '1';
const STORYWEB_STATS_KEEP_DAYS  = 400;

function storyweb_stats_table() {
	global $wpdb;
	return $wpdb->prefix . 'storyweb_stats';
}

// The table is created (or updated) on the first request after a deploy: updating the files does not run the
// activation hook.
add_action(
	'init',
	static function () {
		if ( get_option( 'storyweb_stats_db' ) === STORYWEB_STATS_DB_VERSION ) {
			return;
		}
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$table = storyweb_stats_table();
		dbDelta(
			"CREATE TABLE {$table} (
				day date NOT NULL,
				metric varchar(20) NOT NULL,
				item varchar(191) NOT NULL DEFAULT '',
				hits int(10) unsigned NOT NULL DEFAULT 0,
				PRIMARY KEY  (day,metric,item)
			) {$wpdb->get_charset_collate()};"
		);
		update_option( 'storyweb_stats_db', STORYWEB_STATS_DB_VERSION, true );
	}
);

/** Adds one to today's counter for $metric / $item. */
function storyweb_stats_hit( $metric, $item = '' ) {
	global $wpdb;
	if ( get_option( 'storyweb_stats_db' ) !== STORYWEB_STATS_DB_VERSION ) {
		return;
	}
	$table = storyweb_stats_table();
	$wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- an atomic counter.
		$wpdb->prepare(
			"INSERT INTO {$table} (day, metric, item, hits) VALUES (%s, %s, %s, 1) ON DUPLICATE KEY UPDATE hits = hits + 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name only.
			gmdate( 'Y-m-d' ),
			substr( (string) $metric, 0, 20 ),
			mb_substr( (string) $item, 0, 191 )
		)
	);
}

/** Search engines, link previews, monitors and scripts: not readers. */
function storyweb_stats_is_bot() {
	$agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';
	$hint  = ( isset( $_SERVER['HTTP_SEC_PURPOSE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_SEC_PURPOSE'] ) ) : '' )
		. ( isset( $_SERVER['HTTP_PURPOSE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_PURPOSE'] ) ) : '' );
	return '' === $agent || str_contains( strtolower( $hint ), 'prefetch' )
		|| (bool) preg_match( '/bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse|uptime|monitor|curl|wget|python|java\/|okhttp|go-http/i', $agent );
}

// A locked chapter showed the link gate to a reader (not to editors, who can read it, nor to bots).
add_action(
	'template_redirect',
	static function () {
		if ( ! is_singular( 'chapter' ) || ! function_exists( 'storyweb_unlock_ready' ) || ! storyweb_unlock_ready() ) {
			return;
		}
		$chapter = get_queried_object();
		if ( storyweb_can_read_chapter( $chapter ) || storyweb_stats_is_bot() ) {
			return;
		}
		$story = storyweb_chapter_story( $chapter );
		storyweb_stats_hit( 'gate', $story ? $story->ID : 0 );
	},
	20
);

// Old rows go once a day.
add_action(
	'init',
	static function () {
		if ( ! wp_next_scheduled( 'storyweb_stats_cleanup' ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'storyweb_stats_cleanup' );
		}
	}
);
add_action(
	'storyweb_stats_cleanup',
	static function () {
		global $wpdb;
		$table = storyweb_stats_table();
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE day < %s", gmdate( 'Y-m-d', time() - STORYWEB_STATS_KEEP_DAYS * DAY_IN_SECONDS ) ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name only.
	}
);

/* ---------- Reading the figures (wp-admin) ---------- */

/** The last $days UTC days, oldest first, as 'Y-m-d'. */
function storyweb_stats_days( $days ) {
	$out = array();
	for ( $i = $days - 1; $i >= 0; $i-- ) {
		$out[] = gmdate( 'Y-m-d', time() - $i * DAY_IN_SECONDS );
	}
	return $out;
}

/** Our counters for the last $days days: per day for gate/click, and totals per item for each metric. */
function storyweb_stats_unlock( $days ) {
	global $wpdb;
	$table  = storyweb_stats_table();
	$list   = storyweb_stats_days( $days );
	$result = array(
		'daily' => array_fill_keys( $list, array( 'gate' => 0, 'click' => 0 ) ),
		'gate'  => 0,
		'click' => 0,
		'items' => array( 'gate' => array(), 'click' => array(), 'link' => array(), 'refused' => array() ),
	);
	if ( get_option( 'storyweb_stats_db' ) !== STORYWEB_STATS_DB_VERSION ) {
		return $result;
	}
	$rows = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$wpdb->prepare( "SELECT day, metric, item, hits FROM {$table} WHERE day >= %s", $list[0] ), // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name only.
		ARRAY_A
	);
	foreach ( $rows as $row ) {
		$metric = $row['metric'];
		$hits   = (int) $row['hits'];
		if ( ! isset( $result['items'][ $metric ] ) ) {
			continue;
		}
		$result['items'][ $metric ][ $row['item'] ] = ( $result['items'][ $metric ][ $row['item'] ] ?? 0 ) + $hits;
		if ( isset( $result['daily'][ $row['day'] ][ $metric ] ) ) {
			$result['daily'][ $row['day'] ][ $metric ] += $hits;
			$result[ $metric ]                         += $hits;
		}
	}
	foreach ( $result['items'] as &$items ) {
		arsort( $items );
	}
	unset( $items );
	return $result;
}

/** Post Views Counter's table, or '' when the plugin has not created it. */
function storyweb_stats_views_table() {
	global $wpdb;
	$table = $wpdb->prefix . 'post_views';
	return $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) ) === $table ? $table : ''; // phpcs:ignore WordPress.DB.DirectDatabaseQuery
}

/**
 * Reading figures from Post Views Counter for the last $days days: per day (story pages and chapters), the most
 * read stories (a story's page plus all its chapters) and the all-time total.
 */
function storyweb_stats_reading( $days, $top = 10 ) {
	global $wpdb;
	$list   = storyweb_stats_days( $days );
	$result = array(
		'available' => false,
		'daily'     => array_fill_keys( $list, array( 'story' => 0, 'chapter' => 0 ) ),
		'total'     => 0,
		'all_time'  => 0,
		'top'       => array(),
	);
	$views = storyweb_stats_views_table();
	if ( ! $views ) {
		return $result;
	}
	$result['available'] = true;
	$from                = str_replace( '-', '', $list[0] );
	// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery -- table names only.
	$rows = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT v.period, p.post_type, SUM(v.count) AS hits FROM {$views} v JOIN {$wpdb->posts} p ON p.ID = v.id
			 WHERE v.type = 0 AND v.period >= %s AND p.post_type IN ('story', 'chapter') GROUP BY v.period, p.post_type",
			$from
		),
		ARRAY_A
	);
	foreach ( $rows as $row ) {
		$day = substr( $row['period'], 0, 4 ) . '-' . substr( $row['period'], 4, 2 ) . '-' . substr( $row['period'], 6, 2 );
		if ( isset( $result['daily'][ $day ] ) ) {
			$result['daily'][ $day ][ $row['post_type'] ] += (int) $row['hits'];
			$result['total']                              += (int) $row['hits'];
		}
	}
	$result['top']      = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT CASE WHEN p.post_type = 'chapter' THEN p.post_parent ELSE p.ID END AS story_id, SUM(v.count) AS hits,
			        SUM(CASE WHEN p.post_type = 'chapter' THEN v.count ELSE 0 END) AS chapter_hits
			 FROM {$views} v JOIN {$wpdb->posts} p ON p.ID = v.id
			 WHERE v.type = 0 AND v.period >= %s AND p.post_type IN ('story', 'chapter')
			 GROUP BY story_id HAVING story_id > 0 ORDER BY hits DESC LIMIT %d",
			$from,
			$top
		),
		ARRAY_A
	);
	$result['all_time'] = (int) $wpdb->get_var(
		"SELECT SUM(v.count) FROM {$views} v JOIN {$wpdb->posts} p ON p.ID = v.id WHERE v.type = 4 AND p.post_type IN ('story', 'chapter')"
	);
	// phpcs:enable
	return $result;
}

/** Stories and chapters published, and chapters published in the last $days days. */
function storyweb_stats_content( $days ) {
	global $wpdb;
	$since = gmdate( 'Y-m-d H:i:s', time() - $days * DAY_IN_SECONDS );
	return array(
		'stories'      => (int) wp_count_posts( 'story' )->publish,
		'chapters'     => (int) wp_count_posts( 'chapter' )->publish,
		'new_chapters' => (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'chapter' AND post_status = 'publish' AND post_date_gmt >= %s", $since ) ), // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		'new_stories'  => (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'story' AND post_status = 'publish' AND post_date_gmt >= %s", $since ) ), // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	);
}
