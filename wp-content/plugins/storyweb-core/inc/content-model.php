<?php
/**
 * Content model: `story` (truyện) and `chapter` (chương), genre taxonomy `the_loai`, story meta.
 *
 * A chapter belongs to a story through `post_parent` and is numbered by `menu_order` (1, 2, 3…). Both are core
 * columns, so bulk-import tools can fill them without custom tables.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

/** Story meta keys. Read them through storyweb_story_meta() rather than directly. */
const STORYWEB_META_AUTHOR        = '_sw_author';
const STORYWEB_META_FREE_CHAPTERS = '_sw_free_chapters';
const STORYWEB_META_COMPLETED     = '_sw_completed';
const STORYWEB_META_FEATURED      = '_sw_featured';
const STORYWEB_META_CHAPTER_COUNT = '_sw_chapter_count';
/** Optional display fields: cover symbol (1–2 characters) and the home hero quote. */
const STORYWEB_META_SYMBOL = '_sw_symbol';
const STORYWEB_META_QUOTE  = '_sw_quote';

add_action( 'init', 'storyweb_register_content_model' );

function storyweb_register_content_model() {
	register_post_type(
		'story',
		array(
			'labels'          => array(
				'name'          => 'Truyện',
				'singular_name' => 'Truyện',
				'add_new'       => 'Thêm truyện',
				'add_new_item'  => 'Thêm truyện mới',
				'edit_item'     => 'Sửa truyện',
				'all_items'     => 'Tất cả truyện',
				'search_items'  => 'Tìm truyện',
				'not_found'     => 'Chưa có truyện nào',
			),
			'public'          => true,
			'has_archive'     => false,
			'menu_icon'       => 'dashicons-book-alt',
			'menu_position'   => 5,
			'supports'        => array( 'title', 'editor', 'excerpt', 'thumbnail', 'revisions' ),
			'taxonomies'      => array( 'the_loai', 'post_tag' ),
			'rewrite'         => array(
				'slug'       => 'truyen',
				'with_front' => false,
			),
			// Story pages are public metadata (title, description, cover); the block editor needs REST.
			'show_in_rest'    => true,
			'capability_type' => 'post',
		)
	);

	register_post_type(
		'chapter',
		array(
			'labels'              => array(
				'name'          => 'Chương',
				'singular_name' => 'Chương',
				'add_new'       => 'Thêm chương',
				'add_new_item'  => 'Thêm chương mới',
				'edit_item'     => 'Sửa chương',
				'all_items'     => 'Tất cả chương',
				'not_found'     => 'Chưa có chương nào',
			),
			'public'              => true,
			'publicly_queryable'  => true,
			'show_in_menu'        => 'edit.php?post_type=story',
			'has_archive'         => false,
			'supports'            => array( 'title', 'editor', 'revisions' ),
			// URLs are /doc/<story-slug>/<number>/ (see routing.php); no default rewrite.
			'rewrite'             => false,
			'query_var'           => false,
			// Chapter bodies may be locked: never expose them through REST, search or feeds (see hardening.php).
			'show_in_rest'        => false,
			'exclude_from_search' => true,
			'capability_type'     => 'post',
		)
	);

	register_taxonomy(
		'the_loai',
		'story',
		array(
			'labels'            => array(
				'name'          => 'Thể loại',
				'singular_name' => 'Thể loại',
				'add_new_item'  => 'Thêm thể loại',
				'search_items'  => 'Tìm thể loại',
			),
			'hierarchical'      => true,
			'show_admin_column' => true,
			'show_in_rest'      => true,
			'rewrite'           => array(
				'slug'       => 'the-loai',
				'with_front' => false,
			),
		)
	);

	$auth = static function () {
		return current_user_can( 'edit_posts' );
	};
	register_post_meta(
		'story',
		STORYWEB_META_AUTHOR,
		array(
			'type'              => 'string',
			'single'            => true,
			'sanitize_callback' => 'sanitize_text_field',
			'auth_callback'     => $auth,
			'show_in_rest'      => true,
		)
	);
	register_post_meta(
		'story',
		STORYWEB_META_FREE_CHAPTERS,
		array(
			'type'              => 'integer',
			'single'            => true,
			'default'           => 1,
			'sanitize_callback' => 'storyweb_sanitize_free_chapters',
			'auth_callback'     => $auth,
			'show_in_rest'      => true,
		)
	);
	register_post_meta(
		'story',
		STORYWEB_META_SYMBOL,
		array(
			'type'              => 'string',
			'single'            => true,
			'sanitize_callback' => 'storyweb_sanitize_symbol',
			'auth_callback'     => $auth,
			'show_in_rest'      => true,
		)
	);
	register_post_meta(
		'story',
		STORYWEB_META_QUOTE,
		array(
			'type'              => 'string',
			'single'            => true,
			'sanitize_callback' => 'storyweb_sanitize_quote',
			'auth_callback'     => $auth,
			'show_in_rest'      => true,
		)
	);
	foreach ( array( STORYWEB_META_COMPLETED, STORYWEB_META_FEATURED ) as $flag ) {
		register_post_meta(
			'story',
			$flag,
			array(
				'type'              => 'boolean',
				'single'            => true,
				'default'           => false,
				'sanitize_callback' => 'rest_sanitize_boolean',
				'auth_callback'     => $auth,
				'show_in_rest'      => true,
			)
		);
	}
}

function storyweb_sanitize_free_chapters( $value ) {
	return max( 1, min( 100000, (int) $value ) );
}

function storyweb_sanitize_symbol( $value ) {
	return mb_substr( trim( sanitize_text_field( (string) $value ) ), 0, 2 );
}

function storyweb_sanitize_quote( $value ) {
	return mb_substr( trim( sanitize_text_field( (string) $value ) ), 0, 160 );
}

/**
 * Story fields the theme displays. Never includes chapter bodies.
 *
 * @param int|WP_Post $story Story post.
 * @return array{author:string,free_chapters:int,completed:bool,featured:bool,chapter_count:int,symbol:string,quote:string}
 */
function storyweb_story_meta( $story ) {
	$id = $story instanceof WP_Post ? $story->ID : (int) $story;
	return array(
		'author'        => (string) get_post_meta( $id, STORYWEB_META_AUTHOR, true ),
		'free_chapters' => storyweb_sanitize_free_chapters( get_post_meta( $id, STORYWEB_META_FREE_CHAPTERS, true ) ?: 1 ),
		'completed'     => (bool) get_post_meta( $id, STORYWEB_META_COMPLETED, true ),
		'featured'      => (bool) get_post_meta( $id, STORYWEB_META_FEATURED, true ),
		'chapter_count' => (int) get_post_meta( $id, STORYWEB_META_CHAPTER_COUNT, true ),
		'symbol'        => (string) get_post_meta( $id, STORYWEB_META_SYMBOL, true ),
		'quote'         => (string) get_post_meta( $id, STORYWEB_META_QUOTE, true ),
	);
}

/**
 * Published chapters of a story, ordered by number. Titles and numbers only — bodies are never loaded here.
 *
 * @param int $story_id Story ID.
 * @param int $limit    Max rows (-1 = all).
 * @param int $offset   Rows to skip.
 * @return array<int,array{id:int,number:int,title:string}>
 */
function storyweb_story_chapters( $story_id, $limit = -1, $offset = 0 ) {
	global $wpdb;
	$sql = $wpdb->prepare(
		"SELECT ID, post_title, menu_order FROM {$wpdb->posts}
		 WHERE post_type = 'chapter' AND post_status = 'publish' AND post_parent = %d AND menu_order > 0
		 ORDER BY menu_order ASC",
		$story_id
	);
	if ( $limit > 0 ) {
		$sql .= $wpdb->prepare( ' LIMIT %d OFFSET %d', $limit, max( 0, $offset ) );
	}
	$rows = $wpdb->get_results( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- prepared above.
	return array_map(
		static function ( $row ) {
			return array(
				'id'     => (int) $row->ID,
				'number' => (int) $row->menu_order,
				'title'  => $row->post_title,
			);
		},
		$rows ?: array()
	);
}

/**
 * The chapter post for a story + number, or null.
 *
 * @param int $story_id Story ID.
 * @param int $number   Chapter number (≥ 1).
 */
function storyweb_find_chapter( $story_id, $number ) {
	global $wpdb;
	if ( $number < 1 ) {
		return null;
	}
	$id = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT ID FROM {$wpdb->posts} WHERE post_type = 'chapter' AND post_status = 'publish' AND post_parent = %d AND menu_order = %d LIMIT 1",
			$story_id,
			$number
		)
	);
	return $id ? get_post( (int) $id ) : null;
}

/** Story of a chapter (published), or null. */
function storyweb_chapter_story( $chapter ) {
	$chapter = get_post( $chapter );
	if ( ! $chapter || 'chapter' !== $chapter->post_type || ! $chapter->post_parent ) {
		return null;
	}
	$story = get_post( $chapter->post_parent );
	return $story && 'story' === $story->post_type && 'publish' === $story->post_status ? $story : null;
}

/** Keeps the denormalised chapter count and the story's "updated" time current, so listings never count rows. */
function storyweb_refresh_story_counters( $story_id ) {
	global $wpdb;
	$story_id = (int) $story_id;
	if ( ! $story_id || 'story' !== get_post_type( $story_id ) ) {
		return;
	}
	$count = (int) $wpdb->get_var(
		$wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'chapter' AND post_status = 'publish' AND post_parent = %d AND menu_order > 0", $story_id )
	);
	update_post_meta( $story_id, STORYWEB_META_CHAPTER_COUNT, $count );
}

add_action(
	'save_post_chapter',
	static function ( $post_id, $post ) {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}
		storyweb_refresh_story_counters( $post->post_parent );
		if ( 'publish' === $post->post_status && $post->post_parent ) {
			// Bump the story so "Vừa lên kệ" and "Cập nhật" reflect new chapters.
			$wpdb_story = get_post( $post->post_parent );
			if ( $wpdb_story ) {
				global $wpdb;
				$wpdb->update(
					$wpdb->posts,
					array(
						'post_modified'     => current_time( 'mysql' ),
						'post_modified_gmt' => current_time( 'mysql', true ),
					),
					array( 'ID' => $wpdb_story->ID )
				);
				clean_post_cache( $wpdb_story->ID );
			}
		}
	},
	10,
	2
);

add_action(
	'before_delete_post',
	static function ( $post_id ) {
		$post = get_post( $post_id );
		if ( $post && 'chapter' === $post->post_type && $post->post_parent ) {
			$parent = $post->post_parent;
			add_action(
				'deleted_post',
				static function () use ( $parent ) {
					storyweb_refresh_story_counters( $parent );
				}
			);
		}
	}
);

add_action(
	'transition_post_status',
	static function ( $new, $old, $post ) {
		if ( 'chapter' === $post->post_type && $new !== $old ) {
			storyweb_refresh_story_counters( $post->post_parent );
		}
	},
	10,
	3
);
