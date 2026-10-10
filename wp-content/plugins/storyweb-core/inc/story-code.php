<?php
/**
 * Mã truyện: published stories are numbered TT2D1, TT2D2… The title starts with the code ("TT2D1 - Tên truyện")
 * and the links use it (/truyen/tt2d1/, /doc/tt2d1/3/); old links, and codes typed in capitals, redirect.
 * The code lives in post meta _sw_code. A story gets the next code when it is first published (wp-admin, block
 * editor, WXR import) and keeps it for good, even if a later story is deleted; saving a title without the prefix, or
 * another slug, puts them back. Titles and slugs are written straight to the database so the story's "updated"
 * time, and the home page order, stay as they were.
 * Existing stories: scripts/wp/assign-story-codes.php (oldest first, by ID).
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

const STORYWEB_CODE_PREFIX = 'TT2D';
const STORYWEB_CODE_SEP    = ' - ';
const STORYWEB_META_CODE   = '_sw_code';
/** Next number to hand out (never goes back, so a deleted story's code is not reused). */
const STORYWEB_CODE_NEXT_OPTION = 'storyweb_code_next';

function storyweb_code_format( $number ) {
	return STORYWEB_CODE_PREFIX . (int) $number;
}

/** The title without a leading code ("TT2D12 - ", also zero-padded or with –, :, | or nothing between). */
function storyweb_title_without_code( $title ) {
	return (string) preg_replace( '/^\s*' . STORYWEB_CODE_PREFIX . '\d+\s*[-–—:|.]?\s*/u', '', (string) $title );
}

function storyweb_title_with_code( $title, $code ) {
	$bare = storyweb_title_without_code( $title );
	return '' === $code ? $bare : $code . STORYWEB_CODE_SEP . $bare;
}

/** A story's code, or ''. */
function storyweb_story_code( $story ) {
	$story = get_post( $story );
	return $story ? (string) get_post_meta( $story->ID, STORYWEB_META_CODE, true ) : '';
}

/** The next free number: past the counter and past every code in use. */
function storyweb_code_next_number() {
	global $wpdb;
	$highest = (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT MAX(CAST(SUBSTRING(meta_value, %d) AS UNSIGNED)) FROM {$wpdb->postmeta} WHERE meta_key = %s",
			strlen( STORYWEB_CODE_PREFIX ) + 1,
			STORYWEB_META_CODE
		)
	);
	return max( (int) get_option( STORYWEB_CODE_NEXT_OPTION, 1 ), $highest + 1 );
}

/**
 * Gives `$code` to the story without touching its "updated" time: meta, title prefix, and the slug, so its links
 * become /truyen/tt2d1/ and /doc/tt2d1/<n>/. The previous slug is kept as _wp_old_slug: WordPress sends
 * /truyen/<old>/ to the new address and inc/routing.php does the same for /doc/<old>/<n>/.
 */
function storyweb_set_story_code( $story, $code ) {
	global $wpdb;
	$story = get_post( $story );
	if ( ! $story ) {
		return;
	}
	update_post_meta( $story->ID, STORYWEB_META_CODE, $code );
	$changes = array();
	$title   = storyweb_title_with_code( $story->post_title, $code );
	if ( $title !== $story->post_title ) {
		$changes['post_title'] = $title;
	}
	$slug = strtolower( $code );
	if ( $slug !== $story->post_name ) {
		$changes['post_name'] = $slug;
		$old                  = get_post_meta( $story->ID, '_wp_old_slug' );
		if ( '' !== $story->post_name && ! in_array( $story->post_name, $old, true ) ) {
			add_post_meta( $story->ID, '_wp_old_slug', $story->post_name );
		}
		if ( in_array( $slug, $old, true ) ) {
			delete_post_meta( $story->ID, '_wp_old_slug', $slug );
		}
	}
	if ( $changes ) {
		$wpdb->update( $wpdb->posts, $changes, array( 'ID' => $story->ID ) );
		clean_post_cache( $story->ID );
	}
}

/** The published story that used to have slug `$slug`, or null. */
function storyweb_story_by_old_slug( $slug ) {
	global $wpdb;
	$id = (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT p.ID FROM {$wpdb->postmeta} m JOIN {$wpdb->posts} p ON p.ID = m.post_id WHERE m.meta_key = '_wp_old_slug' AND m.meta_value = %s AND p.post_type = 'story' AND p.post_status = 'publish' ORDER BY m.meta_id DESC LIMIT 1",
			$slug
		)
	);
	return $id ? get_post( $id ) : null;
}

/** A story's earlier slugs (for visitors' saved progress and bookshelf). @return string[] */
function storyweb_story_old_slugs( $story ) {
	$story = get_post( $story );
	return $story ? array_values( array_filter( array_map( 'strval', get_post_meta( $story->ID, '_wp_old_slug' ) ) ) ) : array();
}

/** Makes sure a published story has its code and its title starts with it. @return string The code, or ''. */
function storyweb_ensure_story_code( $story ) {
	$story = get_post( $story );
	if ( ! $story || 'story' !== $story->post_type || 'publish' !== $story->post_status ) {
		return '';
	}
	$code = storyweb_story_code( $story );
	if ( '' === $code ) {
		$number = storyweb_code_next_number();
		$code   = storyweb_code_format( $number );
		update_option( STORYWEB_CODE_NEXT_OPTION, $number + 1, false );
	}
	storyweb_set_story_code( $story, $code );
	return $code;
}

// After every save (meta and terms included): published stories get or keep their code.
add_action(
	'wp_after_insert_post',
	static function ( $post_id, $post ) {
		if ( $post instanceof WP_Post && 'story' === $post->post_type && 'publish' === $post->post_status ) {
			storyweb_ensure_story_code( $post );
		}
	},
	10,
	2
);
