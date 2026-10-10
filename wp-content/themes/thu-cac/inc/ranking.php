<?php
/**
 * "Xem nhiều": stories ranked by views today, this week, this month or all time. A story's views are its page plus
 * all of its chapters, like the count on story cards (thu_cac_views). Read from Post Views Counter's table with the
 * same periods it writes (its clock, UTC by default); cached ten minutes per period. Only titles, covers and counts
 * are shown: never chapter text.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

/** Periods: URL key => tab label. */
function thu_cac_ranking_periods() {
	return array(
		'ngay'   => 'Hôm nay',
		'tuan'   => 'Tuần này',
		'thang'  => 'Tháng này',
		'tat-ca' => 'Tất cả',
	);
}

/** Post Views Counter's row type and period key for one of our periods. @return array{0:int,1:string} */
function thu_cac_ranking_bucket( $period ) {
	$options = get_option( 'post_views_counter_settings_general', array() );
	$time    = (int) current_time( 'timestamp', 'gmt' === ( is_array( $options ) ? ( $options['count_time'] ?? 'gmt' ) : 'gmt' ) );
	switch ( $period ) {
		case 'ngay':
			return array( 0, gmdate( 'Ymd', $time ) );
		case 'tuan':
			return array( 1, gmdate( 'oW', $time ) );
		case 'thang':
			return array( 2, gmdate( 'Ym', $time ) );
		default:
			return array( 4, 'total' );
	}
}

/** Whether view counts exist at all (Post Views Counter active, stories registered). */
function thu_cac_ranking_available() {
	return function_exists( 'pvc_get_post_views' ) && post_type_exists( 'story' );
}

/**
 * The most viewed stories of `$period`, most first.
 *
 * @return array<int,array{id:int,views:int}>
 */
function thu_cac_most_viewed( $period, $limit = 10 ) {
	if ( ! thu_cac_ranking_available() ) {
		return array();
	}
	list( $type, $key ) = thu_cac_ranking_bucket( $period );
	$limit              = max( 1, min( 100, (int) $limit ) );
	$cache              = 'thu_cac_rank_' . $type . '_' . $key . '_' . $limit;
	$rows               = get_transient( $cache );
	if ( ! is_array( $rows ) ) {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- cached right below; Post Views Counter has no API for this.
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT s.ID AS id, SUM(v.count) AS views
				FROM {$wpdb->prefix}post_views v
				JOIN {$wpdb->posts} p ON p.ID = v.id
				JOIN {$wpdb->posts} s ON s.ID = CASE WHEN p.post_type = 'chapter' THEN p.post_parent ELSE p.ID END
				WHERE v.type = %d AND v.period = %s AND p.post_type IN ('story', 'chapter') AND p.post_status = 'publish'
					AND s.post_type = 'story' AND s.post_status = 'publish'
				GROUP BY s.ID
				HAVING views > 0
				ORDER BY views DESC, s.ID ASC
				LIMIT %d",
				$type,
				$key,
				$limit
			),
			ARRAY_A
		);
		$rows = is_array( $rows ) ? $rows : array();
		set_transient( $cache, $rows, 10 * MINUTE_IN_SECONDS );
	}
	return array_map(
		static fn( $row ) => array(
			'id'    => (int) $row['id'],
			'views' => (int) $row['views'],
		),
		$rows
	);
}

/** URL of the ranking page, optionally on a period. */
function thu_cac_ranking_url( $period = '' ) {
	$url = home_url( user_trailingslashit( 'xem-nhieu' ) );
	return '' !== $period && 'tuan' !== $period ? add_query_arg( 'ky', $period, $url ) : $url;
}

/** The period asked for on the ranking page (?ky=), else this week. */
function thu_cac_ranking_current_period() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- public read-only filter.
	$period = isset( $_GET['ky'] ) ? sanitize_key( wp_unslash( $_GET['ky'] ) ) : 'tuan';
	return array_key_exists( $period, thu_cac_ranking_periods() ) ? $period : 'tuan';
}
