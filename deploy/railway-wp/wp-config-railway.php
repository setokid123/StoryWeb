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
unset( $storyweb_site_domain );

// The web server owns the files, so plugins and updates install without FTP.
if ( ! defined( 'FS_METHOD' ) ) {
	define( 'FS_METHOD', 'direct' );
}

// No PHP code editor in wp-admin: a stolen admin session should not become code execution.
if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
	define( 'DISALLOW_FILE_EDIT', true );
}
