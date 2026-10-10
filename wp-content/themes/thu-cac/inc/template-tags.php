<?php
/**
 * Display helpers. Read-only; chapter bodies are never loaded here.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

/** True when the StoryWeb Core plugin (content model + access rules) is active. */
function thu_cac_core_active() {
	return function_exists( 'storyweb_story_meta' ) && post_type_exists( 'story' );
}

/** Cover gradient per genre (same palette as the Next.js StoryWeb). */
function thu_cac_palette( $genre ) {
	$palettes = array(
		'Tình cảm'   => array( '#c47d79', '#6e4c66' ),
		'Cổ đại'     => array( '#703c53', '#271d37' ),
		'Kỳ ảo'      => array( '#3d5277', '#17233f' ),
		'Đời thường' => array( '#a96b46', '#4d302e' ),
		'Đô thị'     => array( '#304e5c', '#152633' ),
	);
	return $palettes[ $genre ] ?? array( '#46645f', '#263a42' );
}

/** "2 giờ trước" within a week, otherwise dd/mm/yyyy. */
function thu_cac_updated_label( $post ) {
	$time = (int) get_post_modified_time( 'U', true, $post );
	if ( ! $time ) {
		return '';
	}
	$diff = time() - $time;
	if ( $diff >= 0 && $diff < WEEK_IN_SECONDS ) {
		return sprintf( '%s trước', human_time_diff( $time, time() ) );
	}
	return wp_date( 'd/m/Y', $time );
}

/**
 * Everything the story card, cover and detail page show.
 *
 * @param int|WP_Post $post Story.
 * @return array<string,mixed>
 */
function thu_cac_story( $post ) {
	$post   = get_post( $post );
	$meta   = thu_cac_core_active() ? storyweb_story_meta( $post ) : array(
		'author'        => '',
		'free_chapters' => 1,
		'completed'     => false,
		'featured'      => false,
		'chapter_count' => 0,
		'symbol'        => '',
		'quote'         => '',
	);
	$terms  = get_the_terms( $post, 'the_loai' );
	$genre  = ( $terms && ! is_wp_error( $terms ) ) ? $terms[0] : null;
	$tags   = get_the_terms( $post, 'post_tag' );
	$rating = (string) get_post_meta( $post->ID, '_sw_rating', true );
	$reads  = (string) get_post_meta( $post->ID, '_sw_reads', true );
	$blurb  = has_excerpt( $post ) ? get_the_excerpt( $post ) : wp_trim_words( wp_strip_all_tags( $post->post_content ), 60, '…' );
	return array(
		'id'            => $post->ID,
		'slug'          => $post->post_name,
		'url'           => get_permalink( $post ),
		'title'         => get_the_title( $post ),
		'author'        => $meta['author'] ? $meta['author'] : 'Đang cập nhật',
		'genre'         => $genre ? $genre->name : 'Truyện',
		'genre_slug'    => $genre ? $genre->slug : '',
		'tags'          => ( $tags && ! is_wp_error( $tags ) ) ? wp_list_pluck( $tags, 'name' ) : array(),
		'status'        => $meta['completed'] ? 'Hoàn thành' : 'Đang ra',
		'blurb'         => $blurb,
		// Home hero quote: the editor's own line, else the start of the description.
		'quote'         => $meta['quote'] ? $meta['quote'] : wp_trim_words( $blurb, 12, '…' ),
		'rating'        => '' !== $rating ? $rating : 'Mới',
		'reads'         => '' !== $reads ? $reads : 'Mới',
		'chapters'      => (int) $meta['chapter_count'],
		'free_chapters' => (int) $meta['free_chapters'],
		'updated'       => thu_cac_updated_label( $post ),
		'palette'       => thu_cac_palette( $genre ? $genre->name : '' ),
		'symbol'        => $meta['symbol'] ? $meta['symbol'] : '✦',
		'thumbnail_id'  => get_post_thumbnail_id( $post ),
	);
}

/**
 * Book cover. With a featured image it shows the image; otherwise the generated Thư Các cover.
 *
 * @param array  $story From thu_cac_story().
 * @param string $class Extra class (story-card__cover, detail-cover…).
 */
function thu_cac_cover( $story, $class = '' ) {
	$label = sprintf( 'Bìa truyện %s', $story['title'] );
	if ( $story['thumbnail_id'] ) {
		printf(
			'<div class="book-cover book-cover--image %1$s" role="img" aria-label="%2$s">%3$s</div>',
			esc_attr( $class ),
			esc_attr( $label ),
			wp_get_attachment_image( $story['thumbnail_id'], 'medium_large', false, array( 'alt' => '', 'loading' => 'lazy' ) )
		);
		return;
	}
	printf(
		'<div class="book-cover %1$s" style="--cover-start:%2$s;--cover-end:%3$s" role="img" aria-label="%4$s"><span class="book-cover__ornament book-cover__ornament--top">✦</span><span class="book-cover__symbol">%5$s</span><span class="book-cover__title">%6$s</span><span class="book-cover__author">%7$s</span><span class="book-cover__ornament book-cover__ornament--bottom">✦</span></div>',
		esc_attr( $class ),
		esc_attr( sanitize_hex_color( $story['palette'][0] ) ),
		esc_attr( sanitize_hex_color( $story['palette'][1] ) ),
		esc_attr( $label ),
		esc_html( $story['symbol'] ),
		esc_html( $story['title'] ),
		esc_html( $story['author'] )
	);
}

/** Story card used on home, search and bookshelf. */
function thu_cac_story_card( $story ) {
	get_template_part( 'template-parts/story-card', null, array( 'story' => $story ) );
}

/**
 * Published stories, most recently updated first.
 *
 * @param array $args Extra WP_Query args.
 * @return WP_Post[]
 */
function thu_cac_stories( $args = array() ) {
	if ( ! post_type_exists( 'story' ) ) {
		return array();
	}
	$query = new WP_Query(
		array_merge(
			array(
				'post_type'           => 'story',
				'post_status'         => 'publish',
				'posts_per_page'      => 8,
				'orderby'             => 'modified',
				'order'               => 'DESC',
				'no_found_rows'       => true,
				'ignore_sticky_posts' => true,
			),
			$args
		)
	);
	return $query->posts;
}

/** Featured story for the home hero: flagged as featured, else the latest. */
function thu_cac_featured_story() {
	$featured = thu_cac_stories(
		array(
			'posts_per_page' => 1,
			'meta_key'       => '_sw_featured', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'meta_value'     => '1', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
		)
	);
	if ( $featured ) {
		return $featured[0];
	}
	$latest = thu_cac_stories( array( 'posts_per_page' => 1 ) );
	return $latest ? $latest[0] : null;
}

/** Genre terms (the_loai), including empty ones, in the order they were created (admins control the order). */
function thu_cac_genres() {
	if ( ! taxonomy_exists( 'the_loai' ) ) {
		return array();
	}
	$terms = get_terms(
		array(
			'taxonomy'   => 'the_loai',
			'hide_empty' => false,
			'orderby'    => 'term_id',
		)
	);
	return is_wp_error( $terms ) ? array() : $terms;
}

/** URL of the discover page, optionally filtered. */
function thu_cac_search_url( $args = array() ) {
	return add_query_arg( array_filter( $args ), home_url( user_trailingslashit( 'tim-kiem' ) ) );
}

/** "Đăng truyện" → wp-admin for editors, login for everyone else. */
function thu_cac_publish_url() {
	$target = admin_url( 'edit.php?post_type=story' );
	return current_user_can( 'edit_posts' ) ? $target : wp_login_url( $target );
}

/** Whether a header link points at the current page (for .is-active). */
function thu_cac_is_current( $url ) {
	$current = wp_parse_url( home_url( add_query_arg( array() ) ), PHP_URL_PATH );
	$target  = wp_parse_url( $url, PHP_URL_PATH );
	return untrailingslashit( (string) $current ) === untrailingslashit( (string) $target );
}

/**
 * Ad placement: home_feed, story_detail, reader_end, search_results. An ad plugin hooks either the generic
 * `thu_cac_ad_slot` action (gets the placement) or the per-placement one, e.g. `thu_cac_ad_slot_reader_end`
 * (Ad Inserter → Hooks). Its output is framed with the "Quảng cáo" label; when it prints nothing, nothing shows.
 */
function thu_cac_ad_slot( $placement ) {
	ob_start();
	do_action( 'thu_cac_ad_slot', $placement );
	do_action( "thu_cac_ad_slot_{$placement}" );
	$ad = trim( (string) ob_get_clean() );
	if ( '' === $ad ) {
		return;
	}
	?>
	<aside class="ad-slot" data-placement="<?php echo esc_attr( $placement ); ?>" aria-label="Quảng cáo">
		<span class="ad-slot__label">Quảng cáo</span>
		<div class="ad-slot__content"><?php echo $ad; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- ad markup an admin configured in the ad plugin. ?></div>
	</aside>
	<?php
}
