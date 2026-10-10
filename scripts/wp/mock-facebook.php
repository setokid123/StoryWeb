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
		return $error( 100, 'Unknown path ' . $path );
	},
	10,
	3
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
