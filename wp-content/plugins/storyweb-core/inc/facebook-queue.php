<?php
/**
 * Tự động đăng: posts a range of stories to the Page in code order (TT2D1 → TT2D50), one every N minutes,
 * with the choices of a manual post (content, cover, comments, hashtags). One run at a time, kept in the option
 * storyweb_fb_queue. WP-Cron posts the next story when it is due: WP-Cron runs on site visits, so a post can come a
 * little late, and the gap after each post is always the full interval.
 * A story without the chosen content falls back (whole chapter → opening of chapter 1 → description); a story with
 * nothing to post is skipped. A Facebook error pauses the run, shown in Truyện → Đăng Facebook, instead of retrying.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

const STORYWEB_FB_QUEUE      = 'storyweb_fb_queue';
const STORYWEB_FB_QUEUE_HOOK = 'storyweb_fb_queue_tick';
const STORYWEB_FB_QUEUE_MAX  = 2000;
/** Story ID => last time it was posted (any way), for "skip stories already posted". */
const STORYWEB_FB_POSTED = 'storyweb_fb_posted';

/** The current run, or null. */
function storyweb_fb_queue() {
	$queue = get_option( STORYWEB_FB_QUEUE, array() );
	return is_array( $queue ) && ! empty( $queue['items'] ) ? $queue : null;
}

function storyweb_fb_queue_save( $queue ) {
	update_option( STORYWEB_FB_QUEUE, $queue, false );
}

/** The number in a code as typed: "TT2D12", "tt2d12", "TT2D00012" or "12". 0 if it is not one. */
function storyweb_fb_code_number( $text ) {
	$prefix = defined( 'STORYWEB_CODE_PREFIX' ) ? STORYWEB_CODE_PREFIX : 'TT2D';
	return preg_match( '/^\s*(?:' . preg_quote( $prefix, '/' ) . ')?0*(\d{1,5})\s*$/i', (string) $text, $m ) ? (int) $m[1] : 0;
}

/** Published stories whose code is from `$from` to `$to`, in code order. @return int[] */
function storyweb_fb_stories_in_range( $from, $to ) {
	global $wpdb;
	$rows = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT p.ID, m.meta_value FROM {$wpdb->postmeta} m JOIN {$wpdb->posts} p ON p.ID = m.post_id WHERE m.meta_key = %s AND p.post_type = 'story' AND p.post_status = 'publish'",
			defined( 'STORYWEB_META_CODE' ) ? STORYWEB_META_CODE : '_sw_code'
		)
	);
	$ids = array();
	foreach ( $rows as $row ) {
		$number = storyweb_fb_code_number( $row->meta_value );
		if ( $number >= $from && $number <= $to ) {
			$ids[ $number ] = (int) $row->ID;
		}
	}
	ksort( $ids );
	return array_values( $ids );
}

/** The source to post for a story: the one asked for, else the next best. '' if the story has nothing. */
function storyweb_fb_pick_source( $sources, $want, $chapter ) {
	$order = array( 'about', 'start', 'chapter-1' );
	if ( 'start' === $want ) {
		$order = array( 'start', 'about' );
	} elseif ( 'chapter' === $want ) {
		$order = array( 'chapter-' . max( 1, (int) $chapter ), 'start', 'about' );
	}
	foreach ( $order as $key ) {
		if ( isset( $sources[ $key ] ) ) {
			return $key;
		}
	}
	return '';
}

/** Remembers that a story was posted (manual or automatic). */
function storyweb_fb_mark_posted( $story_id ) {
	$posted = get_option( STORYWEB_FB_POSTED, array() );
	$posted = is_array( $posted ) ? $posted : array();
	$posted[ (int) $story_id ] = time();
	update_option( STORYWEB_FB_POSTED, $posted, false );
}

function storyweb_fb_was_posted( $story_id ) {
	$posted = get_option( STORYWEB_FB_POSTED, array() );
	return is_array( $posted ) && isset( $posted[ (int) $story_id ] );
}

/** (Re)schedules the run's next post. */
function storyweb_fb_queue_schedule( $queue ) {
	wp_clear_scheduled_hook( STORYWEB_FB_QUEUE_HOOK );
	if ( 'running' === ( $queue['status'] ?? '' ) ) {
		wp_schedule_single_event( max( time() + 1, (int) $queue['next'] ), STORYWEB_FB_QUEUE_HOOK );
	}
}

add_action( STORYWEB_FB_QUEUE_HOOK, 'storyweb_fb_queue_tick' );

/** Posts the next story of the run if it is due. */
function storyweb_fb_queue_tick() {
	$queue = storyweb_fb_queue();
	if ( ! $queue || 'running' !== $queue['status'] || get_transient( 'storyweb_fb_queue_lock' ) ) {
		return;
	}
	if ( time() + 30 < (int) $queue['next'] ) {
		storyweb_fb_queue_schedule( $queue );
		return;
	}
	set_transient( 'storyweb_fb_queue_lock', 1, 5 * MINUTE_IN_SECONDS );
	$total = count( $queue['items'] );
	while ( $queue['pos'] < $total ) {
		$story   = get_post( (int) $queue['items'][ $queue['pos'] ] );
		$sources = ( $story && 'story' === $story->post_type && 'publish' === $story->post_status ) ? storyweb_fb_sources( $story ) : array();
		$key     = storyweb_fb_pick_source( $sources, $queue['source'], $queue['chapter'] );
		if ( '' === $key ) {
			++$queue['pos'];
			++$queue['skipped'];
			continue;
		}
		$result = storyweb_fb_publish( $story, storyweb_fb_message( $story, $sources[ $key ], empty( $queue['comment_on'] ) ), ! empty( $queue['with_cover'] ) );
		if ( is_wp_error( $result ) ) {
			$queue['status'] = 'paused';
			$queue['error']  = sprintf( '%s: %s', get_the_title( $story ), $result->get_error_message() );
			break;
		}
		$vars     = storyweb_fb_comment_vars( $story, $sources[ $key ] );
		$comments = storyweb_fb_post_comments(
			$result['post_id'],
			array(
				empty( $queue['comment_on'] ) ? '' : storyweb_fb_render_comment( $queue['comment_template'], $vars ),
				empty( $queue['comment2_on'] ) ? '' : storyweb_fb_render_comment( $queue['comment2_template'], $vars ),
			)
		);
		storyweb_fb_log( $story, 'Tự động · ' . $sources[ $key ]['label'], $result['post_id'], 0, $comments['status'] );
		++$queue['pos'];
		++$queue['done'];
		$queue['error'] = '';
		$queue['last']  = time();
		$queue['next']  = time() + (int) $queue['interval'];
		break;
	}
	if ( $queue['pos'] >= $total ) {
		$queue['status'] = 'done';
	}
	storyweb_fb_queue_save( $queue );
	storyweb_fb_queue_schedule( $queue );
	delete_transient( 'storyweb_fb_queue_lock' );
}
