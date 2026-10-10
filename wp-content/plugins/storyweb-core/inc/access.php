<?php
/**
 * Read access for chapters, decided on the server for every request. Fails closed.
 *
 * Chapter `n` of a story is free when n ≤ the story's free chapter count (default 1). Any other chapter needs a
 * current unlock grant; the unlock module (ported from StoryWeb M2/M4 in a later step) answers through the
 * `storyweb_has_unlock_grant` filter. Until then nothing beyond the free chapters can be read.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

/** Chapter number (menu_order) of a chapter post, or 0. */
function storyweb_chapter_number( $chapter ) {
	$chapter = get_post( $chapter );
	return ( $chapter && 'chapter' === $chapter->post_type ) ? (int) $chapter->menu_order : 0;
}

/** Whether a chapter is inside the story's free range. */
function storyweb_chapter_is_free( $chapter ) {
	$story  = storyweb_chapter_story( $chapter );
	$number = storyweb_chapter_number( $chapter );
	if ( ! $story || $number < 1 ) {
		return false;
	}
	return $number <= storyweb_story_meta( $story )['free_chapters'];
}

/**
 * Whether the current request may receive the body of $chapter.
 * Editors previewing their own work are allowed; everyone else needs the free range or a grant.
 */
function storyweb_can_read_chapter( $chapter ) {
	$chapter = get_post( $chapter );
	if ( ! $chapter || 'chapter' !== $chapter->post_type ) {
		return false;
	}
	if ( 'publish' !== $chapter->post_status ) {
		return current_user_can( 'edit_post', $chapter->ID );
	}
	if ( ! storyweb_chapter_story( $chapter ) ) {
		return false;
	}
	if ( storyweb_chapter_is_free( $chapter ) ) {
		return true;
	}
	if ( current_user_can( 'edit_post', $chapter->ID ) ) {
		return true;
	}
	/**
	 * Unlock module answers here. Must return true only for a grant the SERVER verified for this request.
	 *
	 * @param bool    $granted Default false.
	 * @param WP_Post $chapter The locked chapter.
	 */
	return true === apply_filters( 'storyweb_has_unlock_grant', false, $chapter );
}

/**
 * What the reader UI needs to show for a locked chapter. The unlock module fills it in; default "off".
 *
 * @return array{mode:string,visit_url:string,expires_at:int|null,access_minutes:int}
 */
function storyweb_unlock_state() {
	$state = apply_filters(
		'storyweb_unlock_state',
		array(
			'mode'           => 'off',
			'visit_url'      => '',
			'expires_at'     => null,
			'access_minutes' => 5,
		)
	);
	if ( ! in_array( $state['mode'] ?? 'off', array( 'off', 'link', 'rewarded' ), true ) ) {
		$state['mode'] = 'off';
	}
	return $state;
}

/**
 * Chapter body for the reader, or null when the request may not read it. The theme must use this (or
 * the_content, which is gated below) — never $post->post_content.
 */
function storyweb_chapter_body( $chapter ) {
	$chapter = get_post( $chapter );
	if ( ! storyweb_can_read_chapter( $chapter ) ) {
		return null;
	}
	return $chapter->post_content;
}

// Defence in depth for templates and plugins that go through the WordPress template API. content_pagination
// receives the post being split, so get_the_content(), the_content() and generated excerpts of a locked chapter
// come out empty even when the global post is another one (widgets, SEO plugins, related-posts boxes).
add_filter(
	'content_pagination',
	static function ( $pages, $post ) {
		if ( $post instanceof WP_Post && 'chapter' === $post->post_type && ! storyweb_can_read_chapter( $post ) ) {
			return array( '' );
		}
		return $pages;
	},
	1,
	2
);

// the_content gets no post argument, so this second layer checks the global post.
add_filter(
	'the_content',
	static function ( $content ) {
		$post = get_post();
		if ( $post && 'chapter' === $post->post_type && ! storyweb_can_read_chapter( $post ) ) {
			return '';
		}
		return $content;
	},
	1
);

// Chapters never have an excerpt (feeds, embeds, SEO descriptions). Run last: at priority 10 core's
// wp_trim_excerpt() rebuilds an empty excerpt from the content, and that text must be dropped too.
foreach ( array( 'get_the_excerpt', 'the_excerpt_rss', 'the_content_feed', 'the_excerpt_embed' ) as $storyweb_hook ) {
	add_filter(
		$storyweb_hook,
		static function ( $text, $post = null ) {
			// Only get_the_excerpt passes a post; the_content_feed passes the feed type.
			$post = get_post( $post instanceof WP_Post ? $post : null );
			return ( $post && 'chapter' === $post->post_type ) ? '' : $text;
		},
		PHP_INT_MAX,
		2
	);
}
unset( $storyweb_hook );
