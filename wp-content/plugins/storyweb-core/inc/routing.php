<?php
/**
 * Chapter URLs: /doc/<story-slug>/<number>/ (same as the Next.js StoryWeb, so links and SEO carry over).
 * Stories use the post type rewrite: /truyen/<slug>/.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

/** Bump when the rules below change: rules are cached in the database and are re-flushed once per revision. */
const STORYWEB_REWRITE_REV = '2';

add_action( 'init', 'storyweb_register_rewrites' );
add_action(
	'init',
	static function () {
		if ( get_option( 'storyweb_rewrite_rev' ) !== STORYWEB_REWRITE_REV ) {
			flush_rewrite_rules( false );
			update_option( 'storyweb_rewrite_rev', STORYWEB_REWRITE_REV, true );
		}
	},
	99
);

function storyweb_register_rewrites() {
	add_rewrite_rule( '^doc/([a-z0-9-]+)/([0-9]{1,6})/?$', 'index.php?sw_story=$matches[1]&sw_chapter=$matches[2]', 'top' );
	// Anything else under /doc/ (e.g. /doc/x/2/embed/, /doc/x/) is a real 404, not a fallback to the home page.
	add_rewrite_rule( '^doc(/.*)?$', 'index.php?sw_doc_404=1', 'top' );
}

add_filter(
	'query_vars',
	static function ( $vars ) {
		$vars[] = 'sw_story';
		$vars[] = 'sw_chapter';
		$vars[] = 'sw_doc_404';
		return $vars;
	}
);

/**
 * Turns /doc/<slug>/<n>/ into a normal singular query for that chapter, so the theme's single-chapter.php renders
 * it through the standard template hierarchy. Unknown story/number → 404.
 */
add_filter(
	'request',
	static function ( $vars ) {
		if ( ! empty( $vars['sw_doc_404'] ) ) {
			return array( 'error' => '404' );
		}
		if ( empty( $vars['sw_story'] ) || ! isset( $vars['sw_chapter'] ) ) {
			return $vars;
		}
		$story   = get_page_by_path( sanitize_title( $vars['sw_story'] ), OBJECT, 'story' );
		$number  = (int) $vars['sw_chapter'];
		$chapter = ( $story && 'publish' === $story->post_status ) ? storyweb_find_chapter( $story->ID, $number ) : null;
		if ( ! $chapter ) {
			return array( 'error' => '404' );
		}
		return array(
			'post_type' => 'chapter',
			'p'         => $chapter->ID,
		);
	}
);

add_filter(
	'post_type_link',
	static function ( $url, $post ) {
		if ( 'chapter' !== $post->post_type ) {
			return $url;
		}
		$story = get_post( $post->post_parent );
		if ( ! $story || ! $post->menu_order ) {
			return $url;
		}
		return home_url( user_trailingslashit( 'doc/' . $story->post_name . '/' . (int) $post->menu_order ) );
	},
	10,
	2
);

/** URL of chapter `number` of a story (no query; used for prev/next and lists). */
function storyweb_chapter_url( $story, $number ) {
	$story = get_post( $story );
	return $story ? home_url( user_trailingslashit( 'doc/' . $story->post_name . '/' . (int) $number ) ) : '';
}
