<?php
/**
 * Railway settings, loaded by wp-config.php on every request (via WORDPRESS_CONFIG_EXTRA, see entrypoint.sh).
 */

// Railway ends HTTPS at its proxy and forwards plain HTTP. Trust the forwarded scheme so WordPress
// builds https:// links instead of looping on redirects.
if ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && 'https' === $_SERVER['HTTP_X_FORWARDED_PROTO'] ) {
	$_SERVER['HTTPS'] = 'on';
}

// Site address: a custom domain in SITE_DOMAIN wins, else the domain Railway generated.
$storyweb_site_domain = getenv( 'SITE_DOMAIN' ) ?: getenv( 'RAILWAY_PUBLIC_DOMAIN' );
if ( $storyweb_site_domain && ! defined( 'WP_HOME' ) ) {
	define( 'WP_HOME', 'https://' . $storyweb_site_domain );
	define( 'WP_SITEURL', 'https://' . $storyweb_site_domain );
}

// With SITE_DOMAIN set, any other *.up.railway.app address of this service (e.g. the first generated one) moves
// there for good, so old links and bookmarks keep working. Health checks and the PHP CLI use other hosts.
$storyweb_host = isset( $_SERVER['HTTP_HOST'] ) ? strtolower( (string) $_SERVER['HTTP_HOST'] ) : '';
if ( getenv( 'SITE_DOMAIN' ) && 'cli' !== PHP_SAPI && str_ends_with( $storyweb_host, '.up.railway.app' ) && strtolower( getenv( 'SITE_DOMAIN' ) ) !== $storyweb_host ) {
	$storyweb_method = isset( $_SERVER['REQUEST_METHOD'] ) ? $_SERVER['REQUEST_METHOD'] : 'GET';
	header( 'Location: https://' . getenv( 'SITE_DOMAIN' ) . ( isset( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : '/' ), true, in_array( $storyweb_method, array( 'GET', 'HEAD' ), true ) ? 301 : 308 );
	exit;
}
unset( $storyweb_site_domain, $storyweb_host );

// WP-Cron runs from entrypoint.sh, which calls wp-cron.php through Apache once a minute. Page views no longer spawn
// it: WordPress's spawn is a 0.01-second non-blocking request that often never arrives, and the lock it leaves for a
// minute made the minute calls skip their turn.
if ( ! defined( 'DISABLE_WP_CRON' ) && 'cli' !== PHP_SAPI ) {
	define( 'DISABLE_WP_CRON', true );
}

// Pages get 128 MB (WordPress's default for the front end is 40 MB; php.ini allows 256 MB, which wp-admin uses).
if ( ! defined( 'WP_MEMORY_LIMIT' ) ) {
	define( 'WP_MEMORY_LIMIT', '128M' );
}

// The web server owns the files, so plugins and updates install without FTP.
if ( ! defined( 'FS_METHOD' ) ) {
	define( 'FS_METHOD', 'direct' );
}

// No PHP code editor in wp-admin: a stolen admin session should not become code execution.
if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
	define( 'DISALLOW_FILE_EDIT', true );
}
