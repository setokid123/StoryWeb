<?php
/**
 * Theme pages that need no WordPress "Page": /tim-kiem/ (discover/search) and /tu-truyen/ (bookshelf),
 * same URLs as the Next.js app.
 *
 * The discover page's main query IS the story search, so WordPress pagination works and nothing loads the whole
 * catalogue (the Next.js version filtered every story in memory).
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

/** Bump when the rules below change (re-flushed once per revision, like StoryWeb Core). */
const THU_CAC_REWRITE_REV = '1';

add_action( 'init', 'thu_cac_register_view_rewrites' );
add_action(
	'init',
	static function () {
		if ( get_option( 'thu_cac_rewrite_rev' ) !== THU_CAC_REWRITE_REV ) {
			flush_rewrite_rules( false );
			update_option( 'thu_cac_rewrite_rev', THU_CAC_REWRITE_REV, true );
		}
	},
	99
);

function thu_cac_register_view_rewrites() {
	add_rewrite_rule( '^tim-kiem/?$', 'index.php?thu_cac_view=search', 'top' );
	add_rewrite_rule( '^tim-kiem/page/([0-9]{1,6})/?$', 'index.php?thu_cac_view=search&paged=$matches[1]', 'top' );
	add_rewrite_rule( '^tu-truyen/?$', 'index.php?thu_cac_view=bookshelf', 'top' );
}

add_filter(
	'query_vars',
	static function ( $vars ) {
		$vars[] = 'thu_cac_view';
		return $vars;
	}
);

/** Current theme view ('search' | 'bookshelf' | ''). */
function thu_cac_view() {
	$view = get_query_var( 'thu_cac_view' );
	return in_array( $view, array( 'search', 'bookshelf' ), true ) ? $view : '';
}

/** Search text from ?q= (max 100 chars). */
function thu_cac_search_text() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- public read-only filter.
	return isset( $_GET['q'] ) ? mb_substr( sanitize_text_field( wp_unslash( $_GET['q'] ) ), 0, 100 ) : '';
}

// A story code typed in the search box ("TT2D12", "tt2d12", "TT2D00012") opens that story: a plain text search would
// also list TT2D120, TT2D1200…
add_action(
	'template_redirect',
	static function () {
		if ( 'search' !== thu_cac_view() || ! defined( 'STORYWEB_CODE_PREFIX' ) ) {
			return;
		}
		if ( ! preg_match( '/^\s*' . preg_quote( STORYWEB_CODE_PREFIX, '/' ) . '\s*0*(\d{1,6})\s*$/i', thu_cac_search_text(), $m ) ) {
			return;
		}
		$story = get_page_by_path( strtolower( STORYWEB_CODE_PREFIX ) . (int) $m[1], OBJECT, 'story' );
		if ( $story && 'publish' === $story->post_status ) {
			wp_safe_redirect( get_permalink( $story ), 302 );
			exit;
		}
	}
);

/** Genre filter from ?the-loai= (term slug, or name for old Next.js links), or null. */
function thu_cac_search_genre() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- public read-only filter.
	$raw = isset( $_GET['the-loai'] ) ? sanitize_text_field( wp_unslash( $_GET['the-loai'] ) ) : '';
	if ( '' === $raw || 'Tất cả' === $raw || ! taxonomy_exists( 'the_loai' ) ) {
		return null;
	}
	$term = get_term_by( 'slug', sanitize_title( $raw ), 'the_loai' );
	if ( ! $term ) {
		$term = get_term_by( 'name', $raw, 'the_loai' );
	}
	return $term ? $term : null;
}

add_action(
	'pre_get_posts',
	static function ( $query ) {
		if ( is_admin() || ! $query->is_main_query() ) {
			return;
		}
		$view = $query->get( 'thu_cac_view' );
		if ( $query->is_tax( 'the_loai' ) ) {
			$query->set( 'posts_per_page', 24 );
			$query->set( 'orderby', 'modified' );
			$query->set( 'order', 'DESC' );
			return;
		}
		if ( 'search' === $view ) {
			$query->set( 'post_type', post_type_exists( 'story' ) ? 'story' : 'post' );
			$query->set( 'post_status', 'publish' );
			$query->set( 'posts_per_page', 24 );
			$query->set( 'orderby', 'modified' );
			$query->set( 'order', 'DESC' );
			$text = thu_cac_search_text();
			if ( '' !== $text ) {
				$query->set( 's', $text );
				$query->set( 'orderby', 'relevance' );
			}
			$genre = thu_cac_search_genre();
			if ( $genre ) {
				$query->set(
					'tax_query',
					array(
						array(
							'taxonomy' => 'the_loai',
							'field'    => 'term_id',
							'terms'    => $genre->term_id,
						),
					)
				);
			}
		} elseif ( 'bookshelf' === $view ) {
			// Saved stories live in the visitor's browser; the page loads them via REST. No main query needed.
			$query->set( 'post_type', 'story' );
			$query->set( 'post__in', array( 0 ) );
			$query->set( 'no_found_rows', true );
		}
	}
);

/*
 * Discover search: the whole phrase in title, description or author name (story meta), like the Next.js page.
 * Replaces WordPress's per-word clause instead of patching its SQL string.
 */
add_filter(
	'posts_search',
	static function ( $search, $query ) {
		global $wpdb;
		if ( 'search' !== $query->get( 'thu_cac_view' ) || ! $query->is_main_query() ) {
			return $search;
		}
		$text = thu_cac_search_text();
		if ( '' === $text ) {
			return $search;
		}
		$like = '%' . $wpdb->esc_like( $text ) . '%';
		$sql  = $wpdb->prepare(
			" AND ( {$wpdb->posts}.post_title LIKE %s OR {$wpdb->posts}.post_excerpt LIKE %s OR {$wpdb->posts}.post_content LIKE %s
			  OR EXISTS ( SELECT 1 FROM {$wpdb->postmeta} swm WHERE swm.post_id = {$wpdb->posts}.ID AND swm.meta_key = '_sw_author' AND swm.meta_value LIKE %s ) ) ",
			$like,
			$like,
			$like,
			$like
		);
		if ( ! is_user_logged_in() ) {
			$sql .= " AND ( {$wpdb->posts}.post_password = '' ) ";
		}
		return $sql;
	},
	10,
	2
);

add_filter(
	'template_include',
	static function ( $template ) {
		$view = thu_cac_view();
		if ( $view ) {
			status_header( 200 );
			return get_template_directory() . '/views/' . $view . '.php';
		}
		return $template;
	}
);

// These views are not the blog home or a 404.
add_action(
	'wp',
	static function () {
		global $wp_query;
		if ( thu_cac_view() ) {
			$wp_query->is_home = false;
			$wp_query->is_404  = false;
		}
	}
);

add_filter(
	'pre_get_document_title',
	static function ( $title ) {
		$view = thu_cac_view();
		if ( 'search' === $view ) {
			return 'Khám phá truyện | ' . get_bloginfo( 'name' );
		}
		if ( 'bookshelf' === $view ) {
			return 'Tủ truyện của bạn | ' . get_bloginfo( 'name' );
		}
		return $title;
	}
);
