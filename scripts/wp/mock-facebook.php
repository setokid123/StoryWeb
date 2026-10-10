<?php
/**
 * LOCAL TESTS ONLY (WordPress Playground, scripts/wp/check-facebook.mjs). Never install on a real site.
 * Must-use plugin that answers Graph API calls in place of Facebook and records them, so "Truyện → Đăng Facebook"
 * can be tested without a Page: page 111 accepts posts, page 222 cannot post (no CREATE_CONTENT task).
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

add_filter(
	'pre_http_request',
	static function ( $pre, $args, $url ) {
		if ( 0 !== strpos( $url, 'https://graph.facebook.com/' ) ) {
			return $pre;
		}
		$parts  = wp_parse_url( $url );
		$query  = array();
		parse_str( $parts['query'] ?? '', $query );
		$path   = preg_replace( '#^/v[0-9.]+/#', '', $parts['path'] ?? '' );
		$method = strtoupper( $args['method'] ?? 'GET' );
		$params = 'GET' === $method ? $query : (array) $args['body'];
		$log    = get_option( 'sw_fb_mock_log', array() );
		$log[]  = array(
			'method' => $method,
			'path'   => $path,
			'params' => $params,
		);
		update_option( 'sw_fb_mock_log', $log, false );

		$reply = static function ( $data, $code = 200 ) {
			return array(
				'headers'  => array(),
				'body'     => wp_json_encode( $data ),
				'response' => array(
					'code'    => $code,
					'message' => 200 === $code ? 'OK' : 'Bad Request',
				),
				'cookies'  => array(),
				'filename' => null,
			);
		};
		$error = static function ( $code, $message ) use ( $reply ) {
			return $reply( array( 'error' => array( 'code' => $code, 'message' => $message ) ), 400 );
		};
		if ( 'oauth/access_token' === $path ) {
			return 'good-secret' === ( $params['client_secret'] ?? '' ) && 'SHORT-USER-TOKEN' === ( $params['fb_exchange_token'] ?? '' )
				? $reply( array( 'access_token' => 'LONG-USER-TOKEN', 'token_type' => 'bearer', 'expires_in' => 5184000 ) )
				: $error( 190, 'Error validating client secret.' );
		}
		if ( 'me/accounts' === $path ) {
			return 'LONG-USER-TOKEN' === ( $params['access_token'] ?? '' )
				? $reply(
					array(
						'data' => array(
							array( 'id' => '111', 'name' => 'Trạm Truyện 2D', 'access_token' => 'PAGE-TOKEN-111', 'tasks' => array( 'ANALYZE', 'ADVERTISE', 'MODERATE', 'CREATE_CONTENT', 'MANAGE' ) ),
							array( 'id' => '222', 'name' => 'Page chỉ xem', 'access_token' => 'PAGE-TOKEN-222', 'tasks' => array( 'ANALYZE' ) ),
						),
					)
				)
				: $error( 190, 'Invalid OAuth access token.' );
		}
		$page_ok = 'PAGE-TOKEN-111' === ( $params['access_token'] ?? '' );
		if ( '111' === $path ) {
			return $page_ok ? $reply( array( 'id' => '111', 'name' => 'Trạm Truyện 2D' ) ) : $error( 190, 'Invalid OAuth access token.' );
		}
		if ( '111/photos' === $path ) {
			return $page_ok ? $reply( array( 'id' => '9001', 'post_id' => '111_9001' ) ) : $error( 190, 'Invalid OAuth access token.' );
		}
		if ( '111/feed' === $path ) {
			return $page_ok ? $reply( array( 'id' => '111_9002' ) ) : $error( 190, 'Invalid OAuth access token.' );
		}
		if ( preg_match( '#^(111_\d+)/comments$#', $path, $m ) ) {
			if ( ! $page_ok ) {
				return $error( 190, 'Invalid OAuth access token.' );
			}
			// A comment containing FAIL-COMMENT plays a token without pages_manage_engagement.
			return false !== strpos( (string) ( $params['message'] ?? '' ), 'FAIL-COMMENT' )
				? $error( 200, '(#200) Permissions error' )
				: $reply( array( 'id' => $m[1] . '_c1' ) );
		}
		return $error( 100, 'Unknown path ' . $path );
	},
	10,
	3
);

// The test script lists, and runs now, the first comments waiting in WP-Cron for scheduled posts.
add_action(
	'wp_ajax_sw_fb_mock_cron',
	static function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( '', '', array( 'response' => 403 ) );
		}
		$events = array();
		foreach ( (array) _get_cron_array() as $time => $hooks ) {
			foreach ( (array) ( $hooks['storyweb_fb_scheduled_comment'] ?? array() ) as $event ) {
				$events[] = array( 'time' => (int) $time, 'args' => $event['args'] );
			}
		}
		if ( ! empty( $_GET['run'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- local test helper.
			foreach ( $events as $event ) {
				do_action_ref_array( 'storyweb_fb_scheduled_comment', $event['args'] );
				wp_unschedule_event( $event['time'], 'storyweb_fb_scheduled_comment', $event['args'] );
			}
		}
		wp_send_json( $events );
	}
);

// The test script drives "Tự động đăng": run=1 makes the next post due and runs the WP-Cron tick now; break=1 / fix=1
// swap the saved Page token for one Facebook rejects and back. Answers with the run's state.
add_action(
	'wp_ajax_sw_fb_mock_queue',
	static function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( '', '', array( 'response' => 403 ) );
		}
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- local test helper.
		if ( ! empty( $_GET['break'] ) || ! empty( $_GET['fix'] ) ) {
			$s               = storyweb_fb_settings();
			$s['page_token'] = ! empty( $_GET['break'] ) ? 'BROKEN' : 'PAGE-TOKEN-111';
			storyweb_fb_save_settings( $s );
		}
		if ( ! empty( $_GET['run'] ) && storyweb_fb_queue() ) {
			$queue         = storyweb_fb_queue();
			$queue['next'] = 0;
			storyweb_fb_queue_save( $queue );
			do_action( STORYWEB_FB_QUEUE_HOOK );
		}
		// phpcs:enable
		$queue = storyweb_fb_queue();
		wp_send_json(
			array(
				'queue'     => $queue,
				'scheduled' => (int) wp_next_scheduled( STORYWEB_FB_QUEUE_HOOK ),
			)
		);
	}
);

// The test script reads (and resets) the record through admin-ajax, as an administrator.
add_action(
	'wp_ajax_sw_fb_mock_log',
	static function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( '', '', array( 'response' => 403 ) );
		}
		$log = get_option( 'sw_fb_mock_log', array() );
		if ( ! empty( $_GET['reset'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- local test helper.
			delete_option( 'sw_fb_mock_log' );
		}
		wp_send_json( $log );
	}
);
