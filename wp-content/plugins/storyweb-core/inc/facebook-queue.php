<?php
/**
 * Tự động đăng: posts a range of stories to the Page in code order (TT2D1 → TT2D50), one every N minutes, with the
 * choices of a manual post (content, cover, comments, hashtags). One run at a time, kept in the option
 * storyweb_fb_queue.
 *
 * Mode "facebook" (every new run): when the admin confirms, every post is sent to Facebook right away as a scheduled
 * post (published=false + scheduled_publish_time), so Facebook publishes it on time whether or not anyone visits the
 * site; the admin page drives the sending in small batches (admin-ajax), WP-Cron finishes it if the page is closed.
 * Facebook schedules 10 minutes to 75 days ahead: later posts wait and are scheduled when they come within range.
 * Comments cannot be scheduled on Facebook: WP-Cron sends them 2–3 minutes after each post goes live.
 * Mode "cron" (runs created before 0.4.2): WP-Cron publishes each post when it is due; such a run can be switched
 * to mode "facebook" from the admin page.
 *
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
/** A new run starts no earlier than this after it is confirmed (Facebook's 10-minute minimum, with a margin). */
const STORYWEB_FB_QUEUE_LEAD = 15 * MINUTE_IN_SECONDS;

/** The current run, or null. */
function storyweb_fb_queue() {
	$queue = get_option( STORYWEB_FB_QUEUE, array() );
	return is_array( $queue ) && ! empty( $queue['items'] ) ? $queue : null;
}

function storyweb_fb_queue_save( $queue ) {
	update_option( STORYWEB_FB_QUEUE, $queue, false );
}

function storyweb_fb_queue_mode( $queue ) {
	return (string) ( $queue['mode'] ?? 'cron' );
}

/** Time of the k-th post of a Facebook-scheduled run (k from 0; skipped stories leave no gap). */
function storyweb_fb_queue_time( $queue, $k ) {
	return (int) $queue['start'] + (int) $k * (int) $queue['interval'];
}

/** Time of the run's last scheduled post, or 0. */
function storyweb_fb_queue_last_time( $queue ) {
	$posts = (array) ( $queue['posts'] ?? array() );
	return $posts ? (int) end( $posts )['at'] : 0;
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

/** (Re)schedules the run's next WP-Cron tick at $queue['next']. */
function storyweb_fb_queue_schedule( $queue ) {
	wp_clear_scheduled_hook( STORYWEB_FB_QUEUE_HOOK );
	if ( 'running' === ( $queue['status'] ?? '' ) ) {
		wp_schedule_single_event( max( time() + 1, (int) $queue['next'] ), STORYWEB_FB_QUEUE_HOOK );
	}
}

/**
 * The next story of the run that has something to post, with its message and comments, or null at the end.
 * Moves past stories with nothing to post.
 *
 * @return array{story:WP_Post,label:string,message:string,comments:string[]}|null
 */
function storyweb_fb_queue_next_post( &$queue ) {
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
		$vars = storyweb_fb_comment_vars( $story, $sources[ $key ] );
		return array(
			'story'    => $story,
			'label'    => 'Tự động · ' . $sources[ $key ]['label'],
			'message'  => storyweb_fb_message( $story, $sources[ $key ], empty( $queue['comment_on'] ) ),
			'comments' => array_values(
				array_filter(
					array(
						empty( $queue['comment_on'] ) ? '' : storyweb_fb_render_comment( $queue['comment_template'], $vars ),
						empty( $queue['comment2_on'] ) ? '' : storyweb_fb_render_comment( $queue['comment2_template'], $vars ),
					),
					'strlen'
				)
			),
		);
	}
	return null;
}

/**
 * Facebook-scheduled run: sends up to `$max` more posts to Facebook as scheduled posts, each with its comments queued
 * in WP-Cron. Posts more than 75 days ahead wait ("waiting"); WP-Cron sends them when they come within range.
 *
 * @return array|null The run after this step.
 */
function storyweb_fb_queue_step( $max = 5 ) {
	$queue = storyweb_fb_queue();
	if ( ! $queue || 'facebook' !== storyweb_fb_queue_mode( $queue ) || 'running' !== $queue['status'] || get_transient( 'storyweb_fb_queue_lock' ) ) {
		return $queue;
	}
	set_transient( 'storyweb_fb_queue_lock', 1, 5 * MINUTE_IN_SECONDS );
	$queue['waiting'] = false;
	for ( $made = 0; $made < $max; ) {
		$at = max( storyweb_fb_queue_time( $queue, $queue['done'] ), time() + STORYWEB_FB_SCHEDULE_MIN );
		if ( $at > time() + STORYWEB_FB_SCHEDULE_AHEAD ) {
			$queue['waiting'] = true;
			break;
		}
		$next = storyweb_fb_queue_next_post( $queue );
		if ( ! $next ) {
			break;
		}
		$result = storyweb_fb_publish( $next['story'], $next['message'], ! empty( $queue['with_cover'] ), $at );
		if ( is_wp_error( $result ) ) {
			$queue['status'] = 'paused';
			$queue['error']  = sprintf( '%s: %s', get_the_title( $next['story'] ), $result->get_error_message() );
			break;
		}
		$comments = storyweb_fb_post_comments( $result['post_id'], $next['comments'], $at );
		storyweb_fb_log( $next['story'], $next['label'], $result['post_id'], $at, $comments['status'] );
		$queue['posts'][] = array(
			'object'   => $result['object_id'],
			'post'     => $result['post_id'],
			'at'       => $at,
			'comments' => $next['comments'],
		);
		++$queue['pos'];
		++$queue['done'];
		++$made;
		$queue['error'] = '';
	}
	if ( 'running' === $queue['status'] && $queue['pos'] >= count( $queue['items'] ) ) {
		$queue['status']  = 'scheduled';
		$queue['waiting'] = false;
	}
	// Still sending: again in a minute (the admin page usually gets there first). Waiting: when the next post comes
	// within Facebook's range.
	$queue['next'] = $queue['waiting'] ? storyweb_fb_queue_time( $queue, $queue['done'] ) - STORYWEB_FB_SCHEDULE_AHEAD + MINUTE_IN_SECONDS : time() + MINUTE_IN_SECONDS;
	storyweb_fb_queue_save( $queue );
	storyweb_fb_queue_schedule( $queue );
	delete_transient( 'storyweb_fb_queue_lock' );
	return $queue;
}

/**
 * Cancels the run. Posts Facebook has not published yet are deleted there and their comments dropped.
 *
 * @return array{deleted:int,failed:int}
 */
function storyweb_fb_queue_cancel() {
	$queue  = storyweb_fb_queue();
	$counts = array(
		'deleted' => 0,
		'failed'  => 0,
	);
	wp_clear_scheduled_hook( STORYWEB_FB_QUEUE_HOOK );
	if ( $queue ) {
		$s = storyweb_fb_settings();
		foreach ( (array) ( $queue['posts'] ?? array() ) as $post ) {
			if ( (int) $post['at'] <= time() + MINUTE_IN_SECONDS ) {
				continue; // already live (or about to be): it stays
			}
			foreach ( (array) $post['comments'] as $comment ) {
				$args = array( (string) $post['post'], (string) $comment );
				$time = wp_next_scheduled( 'storyweb_fb_scheduled_comment', $args );
				if ( $time ) {
					wp_unschedule_event( $time, 'storyweb_fb_scheduled_comment', $args );
				}
			}
			$deleted = storyweb_fb_request( 'DELETE', rawurlencode( (string) $post['object'] ), array( 'access_token' => $s['page_token'] ) );
			if ( is_wp_error( $deleted ) ) {
				++$counts['failed'];
			} else {
				++$counts['deleted'];
				storyweb_fb_log_update( $post['post'], array( 'comment' => 'Đã hủy lịch' ) );
			}
		}
	}
	delete_option( STORYWEB_FB_QUEUE );
	return $counts;
}

/** Switches a run from WP-Cron posting to Facebook scheduling, keeping its next time (at least 15 minutes ahead). */
function storyweb_fb_queue_to_facebook() {
	$queue = storyweb_fb_queue();
	if ( ! $queue || 'cron' !== storyweb_fb_queue_mode( $queue ) || ! in_array( $queue['status'], array( 'running', 'paused' ), true ) ) {
		return $queue;
	}
	$first           = max( (int) $queue['next'], time() + STORYWEB_FB_QUEUE_LEAD );
	$queue['mode']   = 'facebook';
	$queue['start']  = $first - (int) $queue['done'] * (int) $queue['interval'];
	$queue['status'] = 'running';
	$queue['error']  = '';
	$queue['posts']  = array();
	storyweb_fb_queue_save( $queue );
	return storyweb_fb_queue_step( 5 );
}

add_action( STORYWEB_FB_QUEUE_HOOK, 'storyweb_fb_queue_tick' );

/** WP-Cron: a Facebook-scheduled run sends its next batch; a WP-Cron run posts its next story if it is due. */
function storyweb_fb_queue_tick() {
	$queue = storyweb_fb_queue();
	if ( ! $queue || 'running' !== $queue['status'] ) {
		return;
	}
	if ( 'facebook' === storyweb_fb_queue_mode( $queue ) ) {
		storyweb_fb_queue_step( 10 );
		return;
	}
	if ( get_transient( 'storyweb_fb_queue_lock' ) ) {
		return;
	}
	if ( time() + 30 < (int) $queue['next'] ) {
		storyweb_fb_queue_schedule( $queue );
		return;
	}
	set_transient( 'storyweb_fb_queue_lock', 1, 5 * MINUTE_IN_SECONDS );
	$next = storyweb_fb_queue_next_post( $queue );
	if ( $next ) {
		$result = storyweb_fb_publish( $next['story'], $next['message'], ! empty( $queue['with_cover'] ) );
		if ( is_wp_error( $result ) ) {
			$queue['status'] = 'paused';
			$queue['error']  = sprintf( '%s: %s', get_the_title( $next['story'] ), $result->get_error_message() );
		} else {
			$comments = storyweb_fb_post_comments( $result['post_id'], $next['comments'] );
			storyweb_fb_log( $next['story'], $next['label'], $result['post_id'], 0, $comments['status'] );
			++$queue['pos'];
			++$queue['done'];
			$queue['error'] = '';
			$queue['last']  = time();
			$queue['next']  = time() + (int) $queue['interval'];
		}
	}
	if ( $queue['pos'] >= count( $queue['items'] ) ) {
		$queue['status'] = 'done';
	}
	storyweb_fb_queue_save( $queue );
	storyweb_fb_queue_schedule( $queue );
	delete_transient( 'storyweb_fb_queue_lock' );
}
