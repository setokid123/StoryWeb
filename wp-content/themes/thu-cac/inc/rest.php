<?php
/**
 * Two read-only endpoints for client-side views. Both return public metadata only (no chapter bodies).
 *
 * - GET /wp-json/thu-cac/v1/cards?slugs=a,b,c  → server-rendered story cards for the bookshelf (max 50).
 * - GET /wp-json/thu-cac/v1/chapters?story=ID  → chapter numbers, titles, URLs and lock state for the reader's
 *   chapter list, loaded when the dialog opens so long stories do not bloat every reader page.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'rest_api_init',
	static function () {
		register_rest_route(
			'thu-cac/v1',
			'/cards',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'args'                => array(
					'slugs' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
				'callback'            => 'thu_cac_rest_cards',
			)
		);
		register_rest_route(
			'thu-cac/v1',
			'/chapters',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'args'                => array(
					'story' => array(
						'type'     => 'integer',
						'required' => true,
						'minimum'  => 1,
					),
				),
				'callback'            => 'thu_cac_rest_chapters',
			)
		);
	}
);

function thu_cac_rest_cards( WP_REST_Request $request ) {
	$slugs = array_slice(
		array_values(
			array_unique(
				array_filter(
					array_map( 'trim', explode( ',', (string) $request['slugs'] ) ),
					static function ( $slug ) {
						return (bool) preg_match( '/^[a-z0-9-]{1,180}$/', $slug );
					}
				)
			)
		),
		0,
		50
	);
	if ( ! $slugs || ! post_type_exists( 'story' ) ) {
		return rest_ensure_response( array( 'html' => '', 'count' => 0 ) );
	}
	$posts = get_posts(
		array(
			'post_type'      => 'story',
			'post_status'    => 'publish',
			'post_name__in'  => $slugs,
			'posts_per_page' => 50,
			'no_found_rows'  => true,
		)
	);
	// Slugs saved before the story's links used its code: tell the browser the current slug (site.js updates the shelf).
	$found   = wp_list_pluck( $posts, 'post_name' );
	$renamed = array();
	foreach ( array_diff( $slugs, $found ) as $old ) {
		$moved = function_exists( 'storyweb_story_by_old_slug' ) ? storyweb_story_by_old_slug( $old ) : null;
		if ( $moved ) {
			$renamed[ $old ] = $moved->post_name;
		}
	}
	if ( $renamed ) {
		return rest_ensure_response( array( 'html' => '', 'count' => 0, 'renamed' => $renamed ) );
	}
	// Keep the visitor's saved order.
	usort(
		$posts,
		static function ( $a, $b ) use ( $slugs ) {
			return array_search( $a->post_name, $slugs, true ) <=> array_search( $b->post_name, $slugs, true );
		}
	);
	ob_start();
	foreach ( $posts as $post ) {
		thu_cac_story_card( thu_cac_story( $post ) );
	}
	return rest_ensure_response(
		array(
			'html'  => ob_get_clean(),
			'count' => count( $posts ),
		)
	);
}

function thu_cac_rest_chapters( WP_REST_Request $request ) {
	$story = get_post( (int) $request['story'] );
	if ( ! $story || 'story' !== $story->post_type || 'publish' !== $story->post_status || ! function_exists( 'storyweb_story_chapters' ) ) {
		return new WP_Error( 'not_found', 'Không tìm thấy truyện.', array( 'status' => 404 ) );
	}
	$free     = storyweb_story_meta( $story )['free_chapters'];
	$state    = storyweb_unlock_state();
	$unlocked = ! empty( $state['expires_at'] ) && $state['expires_at'] > time();
	$items    = array();
	foreach ( storyweb_story_chapters( $story->ID ) as $row ) {
		$items[] = array(
			'number' => $row['number'],
			'title'  => $row['title'],
			'url'    => storyweb_chapter_url( $story, $row['number'] ),
			'locked' => $row['number'] > $free && ! $unlocked,
		);
	}
	$response = rest_ensure_response(
		array(
			'story'    => get_the_title( $story ),
			'chapters' => $items,
		)
	);
	$response->header( 'Cache-Control', 'no-store' );
	return $response;
}
