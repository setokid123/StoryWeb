<?php
/**
 * Closes the side doors through which WordPress normally publishes post content, for chapters:
 * REST API, feeds, search, oEmbed, sitemaps and indexing. A paywall that only hides the reader page is useless
 * if /wp-json/ or /feed/ still serve the text.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

// Chapters are registered with show_in_rest=false; also refuse any route that would still return one.
add_filter(
	'rest_pre_dispatch',
	static function ( $result, $server, $request ) {
		$type = $request->get_param( 'type' );
		$sub  = $request->get_param( 'subtype' );
		if ( 'chapter' === $type || 'chapter' === $sub || ( is_array( $sub ) && in_array( 'chapter', $sub, true ) ) ) {
			return new WP_Error( 'rest_forbidden', 'Không hỗ trợ.', array( 'status' => 403 ) );
		}
		return $result;
	},
	10,
	3
);

// Feeds: no chapter feed, ever (e.g. /?post_type=chapter&feed=rss2).
add_action(
	'pre_get_posts',
	static function ( $query ) {
		if ( ! $query->is_main_query() || ! $query->is_feed() ) {
			return;
		}
		$types = (array) $query->get( 'post_type' );
		if ( in_array( 'chapter', $types, true ) ) {
			$query->set( 'post_type', 'post' );
			$query->set( 'post__in', array( 0 ) );
		}
	}
);

// oEmbed: no embed card or embed iframe for chapters.
add_filter(
	'oembed_request_post_id',
	static function ( $post_id ) {
		return 'chapter' === get_post_type( $post_id ) ? 0 : $post_id;
	}
);
add_action(
	'template_redirect',
	static function () {
		if ( is_embed() && is_singular( 'chapter' ) ) {
			global $wp_query;
			$wp_query->set_404();
			status_header( 404 );
			nocache_headers();
		}
	},
	0
);

// Sitemaps list URLs only, but reader pages are noindex (as in the Next.js app), so keep chapters out.
add_filter(
	'wp_sitemaps_post_types',
	static function ( $types ) {
		unset( $types['chapter'] );
		return $types;
	}
);
// Yoast SEO serves its own sitemaps (sitemap_index.xml) and listed every chapter there.
add_filter(
	'wpseo_sitemap_exclude_post_type',
	static function ( $excluded, $post_type ) {
		return 'chapter' === $post_type ? true : $excluded;
	},
	10,
	2
);
add_filter(
	'wp_robots',
	static function ( $robots ) {
		if ( is_singular( 'chapter' ) ) {
			$robots['noindex']  = true;
			$robots['nofollow'] = true;
		}
		return $robots;
	}
);

// Reader pages depend on the visitor's grant: never cache them in shared caches. Page-cache plugins
// (WP Super Cache, W3 Total Cache, Cache Enabler...) also need DONOTCACHEPAGE, the flag they check before storing a page.
add_action(
	'template_redirect',
	static function () {
		if ( is_singular( 'chapter' ) ) {
			nocache_headers();
			if ( ! defined( 'DONOTCACHEPAGE' ) ) {
				define( 'DONOTCACHEPAGE', true );
			}
		}
	}
);
