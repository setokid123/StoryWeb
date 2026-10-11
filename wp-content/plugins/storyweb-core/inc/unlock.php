<?php
/**
 * Mở khóa bằng link: on a locked chapter the reader opens one of the admin's links (a Shopee affiliate link…) through
 * /mo-khoa/, which sets a signed grant cookie and redirects there; for N minutes every locked chapter can be read.
 * Port of StoryWeb M2/M4 (docs/UNLOCK_API.md) with the SEC1 fix (rate limit per IP).
 *
 * - The grant is checked on the server for every request (storyweb_has_unlock_grant): cookie
 *   "v3.<revision>.<expires>.<HMAC>" keyed with the site's salts, valid only while the feature is on, for the current
 *   revision, before expiry and never longer than the configured duration. Anything else fails closed.
 * - /mo-khoa/ grants only for a reader's own click on the gate: a nonce printed in the gate, a link index (never a
 *   URL, so no open redirect), and Fetch Metadata of a top-level navigation that no other site started (browsers
 *   without Fetch Metadata, e.g. Safari before 16.4: a same-origin Referer). A scraper can fake those headers, so
 *   grants are rate limited per IP (storyweb_unlock_rate_limit, default 15 an hour).
 * - Switching the feature, changing the links or "Thu hồi" bumps the revision: earlier grants stop working at once.
 * - As in the old app the site cannot know whether the reader looked at the destination: it is a soft gate.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

const STORYWEB_UNLOCK_OPTION    = 'storyweb_unlock';
const STORYWEB_UNLOCK_COOKIE    = 'storyweb_unlock';
const STORYWEB_UNLOCK_MAX_LINKS = 10;

/** Settings as first installed: off, with the invitation text readers know from the source sites. */
function storyweb_unlock_defaults() {
	return array(
		'enabled'   => false,
		'minutes'   => 60,
		'links'     => array(),
		'title'     => 'Mở khóa chương',
		'before'    => '<p>Mời Quý độc giả <strong>CLICK</strong> vào <strong>LIÊN KẾT HOẶC ẢNH</strong> bên dưới</p>'
			. '<p><strong><span style="color: #e03e2d;">Mở ứng dụng Shopee - Chỉ 1 lần duy nhất</span></strong> để tiếp tục đọc toàn bộ chương truyện!</p>',
		'image'     => '',
		'show_link' => true,
		'button'    => 'Mở liên kết và đọc tiếp',
		'after'     => '<p>Đội ngũ chúng tôi xin chân thành cảm ơn!</p>',
		'revision'  => 1,
	);
}

/** Current settings (saved values over the defaults). */
function storyweb_unlock_settings() {
	$saved = get_option( STORYWEB_UNLOCK_OPTION, array() );
	return array_merge( storyweb_unlock_defaults(), is_array( $saved ) ? $saved : array() );
}

/** On, with at least one link: only then do locked chapters show the link gate and accept grants. */
function storyweb_unlock_ready( $settings = null ) {
	$settings = $settings ?? storyweb_unlock_settings();
	return ! empty( $settings['enabled'] ) && ! empty( $settings['links'] );
}

/**
 * A public https URL (normalized), or '' — no other scheme, IP address, localhost, single-label or internal name,
 * credentials, spaces or control characters, at most 2048 characters.
 */
function storyweb_unlock_clean_url( $url ) {
	$url = trim( (string) $url );
	if ( '' === $url || strlen( $url ) > 2048 || preg_match( '/[\s\x00-\x1f\x7f]/', $url ) ) {
		return '';
	}
	$parts = wp_parse_url( $url );
	if ( ! $parts || 'https' !== strtolower( $parts['scheme'] ?? '' ) || empty( $parts['host'] ) || isset( $parts['user'] ) || isset( $parts['pass'] ) ) {
		return '';
	}
	$host = rtrim( strtolower( $parts['host'] ), '.' );
	if ( filter_var( trim( $host, '[]' ), FILTER_VALIDATE_IP ) || ! str_contains( $host, '.' ) || preg_match( '/^[0-9a-fx.]+$/', $host ) ) {
		return '';
	}
	if ( preg_match( '/(^|\.)(localhost|local|localdomain|internal|intranet|private|lan|home|corp|test|example|invalid|onion|arpa)$/', $host ) ) {
		return '';
	}
	$clean = esc_url_raw( $url, array( 'https' ) );
	return ( $clean && strlen( $clean ) <= 2048 ) ? $clean : '';
}

function storyweb_unlock_key() {
	return wp_salt( 'secure_auth' ) . '|storyweb-unlock';
}

function storyweb_unlock_sign( $revision, $expires ) {
	return hash_hmac( 'sha256', 'v3|' . (int) $revision . '|' . (int) $expires, storyweb_unlock_key() );
}

/** Expiry (Unix time) of this request's valid grant, or 0. */
function storyweb_unlock_grant_expiry() {
	$settings = storyweb_unlock_settings();
	if ( ! storyweb_unlock_ready( $settings ) || empty( $_COOKIE[ STORYWEB_UNLOCK_COOKIE ] ) ) {
		return 0;
	}
	$raw = sanitize_text_field( wp_unslash( $_COOKIE[ STORYWEB_UNLOCK_COOKIE ] ) );
	if ( ! preg_match( '/^v3\.(\d{1,9})\.(\d{10})\.([a-f0-9]{64})$/', $raw, $m ) ) {
		return 0;
	}
	$revision = (int) $m[1];
	$expires  = (int) $m[2];
	$now      = time();
	if ( (int) $settings['revision'] !== $revision || $expires <= $now || $expires - $now > (int) $settings['minutes'] * MINUTE_IN_SECONDS + 60 ) {
		return 0;
	}
	return hash_equals( storyweb_unlock_sign( $revision, $expires ), $m[3] ) ? $expires : 0;
}

add_filter(
	'storyweb_has_unlock_grant',
	static function ( $granted ) {
		return true === $granted || storyweb_unlock_grant_expiry() > 0;
	}
);

/**
 * What the gate shows: mode "link", one of the links picked at random for this page view, our /mo-khoa/ URL for it,
 * the admin's invitation (title, text, image, button) and the expiry of a current grant.
 */
add_filter(
	'storyweb_unlock_state',
	static function ( $state ) {
		$settings = storyweb_unlock_settings();
		if ( ! storyweb_unlock_ready( $settings ) ) {
			return $state;
		}
		$links  = array_values( $settings['links'] );
		$index  = wp_rand( 0, count( $links ) - 1 );
		$expiry = storyweb_unlock_grant_expiry();
		$args   = array(
			'i' => $index,
			'n' => wp_create_nonce( 'storyweb_unlock' ),
		);
		if ( is_singular( 'chapter' ) ) {
			$args['c'] = get_queried_object_id(); // Only for Thống kê: which story the click came from.
		}
		return array_merge(
			$state,
			array(
				'mode'           => 'link',
				'visit_url'      => add_query_arg( $args, home_url( user_trailingslashit( 'mo-khoa' ) ) ),
				'link'           => $links[ $index ],
				'expires_at'     => $expiry ? $expiry : null,
				'access_minutes' => (int) $settings['minutes'],
				'gate'           => array(
					'title'     => $settings['title'],
					'before'    => $settings['before'],
					'image'     => $settings['image'],
					'show_link' => (bool) $settings['show_link'],
					'button'    => $settings['button'],
					'after'     => $settings['after'],
				),
			)
		);
	}
);

/**
 * Whether this request is the reader's own click on a page of this site (see the file comment): a top-level navigation
 * from this site, or from outside any site ("none": an in-app browser handing the link to the phone's browser), never
 * from another site, a frame or a prefetch. Sec-Fetch-User only counts when sent: Safari, and so every iPhone browser,
 * sends the other Fetch Metadata headers but never this one.
 */
function storyweb_unlock_user_click() {
	$header = static function ( $key ) {
		return isset( $_SERVER[ $key ] ) ? strtolower( sanitize_text_field( wp_unslash( $_SERVER[ $key ] ) ) ) : '';
	};
	if ( str_contains( $header( 'HTTP_SEC_PURPOSE' ) . $header( 'HTTP_PURPOSE' ) . $header( 'HTTP_X_MOZ' ), 'prefetch' ) ) {
		return false;
	}
	$site = $header( 'HTTP_SEC_FETCH_SITE' );
	if ( '' !== $site ) {
		$user = $header( 'HTTP_SEC_FETCH_USER' );
		return in_array( $site, array( 'same-origin', 'none' ), true ) && 'navigate' === $header( 'HTTP_SEC_FETCH_MODE' ) && 'document' === $header( 'HTTP_SEC_FETCH_DEST' ) && ( '' === $user || '?1' === $user );
	}
	$referer = wp_get_raw_referer();
	return $referer && wp_parse_url( $referer, PHP_URL_HOST ) === wp_parse_url( home_url(), PHP_URL_HOST );
}

/**
 * Counts a grant for this IP; false once the IP had storyweb_unlock_rate_limit grants without an hour's pause.
 * Only a keyed hash of the IP is stored.
 */
function storyweb_unlock_rate_ok() {
	$limit = max( 1, (int) apply_filters( 'storyweb_unlock_rate_limit', 15 ) );
	$ip    = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	$key   = 'sw_unlock_rl_' . substr( hash_hmac( 'sha256', $ip, storyweb_unlock_key() ), 0, 32 );
	$count = (int) get_transient( $key );
	if ( $count >= $limit ) {
		return false;
	}
	set_transient( $key, $count + 1, HOUR_IN_SECONDS );
	return true;
}

function storyweb_unlock_fail( $status, $message ) {
	wp_die(
		'<p>' . esc_html( $message ) . '</p>',
		'Mở khóa chương',
		array(
			'response'  => (int) $status,
			'back_link' => true,
		)
	);
}

/** GET /mo-khoa/?i=<link index>&n=<nonce>[&c=<chapter ID>]: grant cookie, then 303 to the link. Counted in Thống kê. */
add_action(
	'template_redirect',
	static function () {
		if ( ! get_query_var( 'sw_unlock_visit' ) ) {
			return;
		}
		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow' );
		$settings = storyweb_unlock_settings();
		if ( ! storyweb_unlock_ready( $settings ) ) {
			storyweb_unlock_fail( 404, 'Tính năng mở khóa chương hiện đang tắt.' );
		}
		if ( 'GET' !== ( $_SERVER['REQUEST_METHOD'] ?? '' ) ) {
			storyweb_unlock_fail( 405, 'Hãy bấm liên kết trên trang đọc truyện.' );
		}
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- the nonce is verified right here.
		$index = isset( $_GET['i'] ) && ctype_digit( (string) wp_unslash( $_GET['i'] ) ) ? (int) $_GET['i'] : -1;
		$nonce = isset( $_GET['n'] ) ? sanitize_text_field( wp_unslash( $_GET['n'] ) ) : '';
		// phpcs:enable
		$links = array_values( $settings['links'] );
		if ( $index < 0 || $index >= count( $links ) || ! wp_verify_nonce( $nonce, 'storyweb_unlock' ) ) {
			storyweb_stats_hit( 'refused', 'invalid' );
			storyweb_unlock_fail( 400, 'Liên kết mở khóa không hợp lệ hoặc đã cũ. Hãy quay lại chương và bấm lại.' );
		}
		if ( ! storyweb_unlock_user_click() ) {
			storyweb_stats_hit( 'refused', 'not_click' );
			storyweb_unlock_fail( 400, 'Hãy bấm liên kết ngay trên trang đọc truyện.' );
		}
		if ( ! storyweb_unlock_rate_ok() ) {
			storyweb_stats_hit( 'refused', 'rate' );
			storyweb_unlock_fail( 429, 'Bạn đã mở khóa quá nhiều lần. Vui lòng thử lại sau ít phút.' );
		}
		$revision = (int) $settings['revision'];
		$expires  = time() + (int) $settings['minutes'] * MINUTE_IN_SECONDS;
		setcookie(
			STORYWEB_UNLOCK_COOKIE,
			'v3.' . $revision . '.' . $expires . '.' . storyweb_unlock_sign( $revision, $expires ),
			array(
				'expires'  => $expires,
				'path'     => COOKIEPATH ? COOKIEPATH : '/',
				'domain'   => COOKIE_DOMAIN ? COOKIE_DOMAIN : '',
				'secure'   => is_ssl(),
				'httponly' => true,
				'samesite' => 'Lax',
			)
		);
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- verified above; only a number for the figures.
		$from  = isset( $_GET['c'] ) && ctype_digit( (string) wp_unslash( $_GET['c'] ) ) ? get_post( (int) $_GET['c'] ) : null;
		$story = ( $from && 'chapter' === $from->post_type ) ? storyweb_chapter_story( $from ) : null;
		storyweb_stats_hit( 'click', $story ? $story->ID : 0 );
		storyweb_stats_hit( 'link', $links[ $index ] );
		header( 'Referrer-Policy: origin' );
		wp_redirect( $links[ $index ], 303, 'StoryWeb' ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect -- only a link the admin saved (validated https), chosen by index.
		exit;
	},
	0
);
