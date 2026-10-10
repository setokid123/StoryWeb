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

/** Name shown in the logo (Giao diện → Tùy biến → Trạm Truyện 2D). The site title stays the <title> text. */
function thu_cac_brand_name() {
	$name = trim( (string) get_theme_mod( 'thu_cac_brand', '' ) );
	return '' !== $name ? $name : 'Trạm Truyện 2D';
}

/**
 * Logo mark: a speech balloon shaped like a station stop, with an interlaced "DD" monogram and a sparkle.
 * "2D" is the two founders, whose names both start with D (not "2D" as in animation).
 * Gradient ids are numbered so the header and footer copies never clash.
 *
 * @param int    $size  Width/height in px.
 * @param string $class Extra class.
 */
function thu_cac_logo_mark( $size = 40, $class = '' ) {
	static $n = 0;
	$id     = 'tt2d-' . ( ++$n );
	$bubble = 'M18 4h12a14 14 0 0 1 14 14v6a14 14 0 0 1-14 14h-8l-9.2 6.6c-.8.6-1.9-.2-1.6-1.1L13 36.6A14 14 0 0 1 4 24v-6A14 14 0 0 1 18 4z';
	return sprintf(
		'<svg class="logo-mark %1$s" width="%2$d" height="%2$d" viewBox="0 0 48 48" aria-hidden="true" focusable="false">'
		. '<defs><linearGradient id="%3$s-g" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4f7bff"/><stop offset=".5" stop-color="#8b4dff"/><stop offset="1" stop-color="#ff4f9a"/></linearGradient>'
		. '<radialGradient id="%3$s-h" cx="14" cy="8" r="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".55" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>'
		. '<path d="%4$s" fill="url(#%3$s-g)"/><path d="%4$s" fill="url(#%3$s-h)"/><path d="%4$s" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>'
		. '<g fill="none" stroke="#fff" stroke-linejoin="round"><path d="M11 12h3.5a8.5 8.5 0 0 1 0 17h-3.5z" stroke-opacity=".7" stroke-width="2.4"/><path d="M20 16h3.5a8.5 8.5 0 0 1 0 17h-3.5z" stroke-width="2.6"/></g>'
		. '<path d="M36.5 6c.4 2.6 1.4 4 4.5 4.5-3.1.5-4.1 1.9-4.5 4.5-.4-2.6-1.4-4-4.5-4.5 3.1-.5 4.1-1.9 4.5-4.5z" fill="#ffe9a8"/></svg>',
		esc_attr( $class ),
		(int) $size,
		esc_attr( $id ),
		$bubble
	);
}

/** Logo: mark + wordmark. A trailing "2D" becomes the glass chip. */
function thu_cac_brand( $size = 40 ) {
	$name = thu_cac_brand_name();
	$word = $name;
	$tail = '';
	if ( preg_match( '/^(.+?)\s*(2D)$/iu', $name, $m ) ) {
		$word = $m[1];
		$tail = strtoupper( $m[2] );
	}
	echo thu_cac_logo_mark( $size ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed markup, escaped attributes.
	echo '<span class="brand__text"><span class="brand__word">' . esc_html( $word ) . '</span>';
	if ( $tail ) {
		echo '<span class="brand__2d">' . esc_html( $tail ) . '</span>';
	}
	echo '</span>';
}

/** Cover gradient for generated covers: a vivid 2D palette picked from the genre name (stable per genre). */
function thu_cac_palette( $genre ) {
	$palettes = array(
		array( '#ff7eb3', '#7b4dff' ),
		array( '#4facfe', '#6a3df5' ),
		array( '#ffb36b', '#ff4f8b' ),
		array( '#22c1c3', '#3d5afe' ),
		array( '#c471ed', '#4568dc' ),
		array( '#f7797d', '#a044ff' ),
		array( '#2bc79a', '#2b5fc5' ),
		array( '#ff9a5a', '#d6337a' ),
	);
	return $palettes[ crc32( (string) $genre ) % count( $palettes ) ];
}

/**
 * Genre as a "tuyến" (metro line): a line number in the order admins created the genres, and a line colour.
 * Every colour keeps white text above 4.5:1. A genre that is not a term ("Truyện") gets a sparkle.
 *
 * @return array{color:string,code:string}
 */
function thu_cac_line( $genre ) {
	static $index = null;
	if ( null === $index ) {
		$index = array();
		foreach ( thu_cac_genres() as $i => $term ) {
			$index[ $term->name ] = $i;
		}
	}
	$colors = array( '#e11d74', '#6d3df5', '#0072bb', '#c2410c', '#0f7f63', '#be185d', '#3b5bdb', '#9c36b5', '#0b7285', '#a8550a' );
	$genre  = trim( (string) $genre );
	if ( isset( $index[ $genre ] ) ) {
		return array(
			'color' => $colors[ $index[ $genre ] % count( $colors ) ],
			'code'  => (string) ( $index[ $genre ] + 1 ),
		);
	}
	return array(
		'color' => $colors[ crc32( $genre ) % count( $colors ) ],
		'code'  => '✦',
	);
}

/**
 * Line pill for a genre: coloured code circle + name.
 *
 * @param string $name  Genre name.
 * @param string $class Extra class.
 * @param string $url   Optional link.
 */
function thu_cac_line_pill( $name, $class = '', $url = '' ) {
	$line  = thu_cac_line( $name );
	$inner = '<span class="line-pill__code">' . esc_html( $line['code'] ) . '</span><span class="line-pill__name">' . esc_html( $name ) . '</span>';
	$attrs = 'class="line-pill ' . esc_attr( $class ) . '" style="--line:' . esc_attr( $line['color'] ) . '"';
	if ( $url ) {
		echo '<a ' . $attrs . ' href="' . esc_url( $url ) . '">' . $inner . '</a>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
		return;
	}
	echo '<span ' . $attrs . '>' . $inner . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
}

/**
 * Views of a story from the Post Views Counter plugin: the story page plus all its chapters. Null when the plugin
 * is not active (the theme then shows nothing, or the editor's "_sw_reads" number). Counts only — never content.
 *
 * @param int $story_id Story ID.
 * @return int|null
 */
function thu_cac_views( $story_id ) {
	static $cache = array();
	if ( ! function_exists( 'pvc_get_post_views' ) ) {
		return null;
	}
	$story_id = (int) $story_id;
	if ( ! isset( $cache[ $story_id ] ) ) {
		global $wpdb;
		$ids   = array_map(
			'intval',
			$wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'chapter' AND post_status = 'publish' AND post_parent = %d", $story_id ) )
		);
		$ids[] = $story_id;
		$cache[ $story_id ] = (int) pvc_get_post_views( $ids );
	}
	return $cache[ $story_id ];
}

/** Short view count: 950, 12,3K, 1,2Tr. */
function thu_cac_compact_number( $number ) {
	$number = (int) $number;
	if ( $number < 10000 ) {
		return number_format_i18n( $number );
	}
	if ( $number < 1000000 ) {
		return number_format_i18n( $number / 1000, $number < 100000 ? 1 : 0 ) . 'K';
	}
	return number_format_i18n( $number / 1000000, 1 ) . 'Tr';
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
		'author'        => $meta['author'],
		// Imported stories often have no author: say so plainly ("Đang cập nhật" read like a story status).
		'author_label'  => $meta['author'] ? $meta['author'] : 'Chưa rõ tác giả',
		'genre'         => $genre ? $genre->name : 'Truyện',
		'genre_slug'    => $genre ? $genre->slug : '',
		'genre_url'     => $genre ? thu_cac_search_url( array( 'the-loai' => $genre->slug ) ) : thu_cac_search_url(),
		'tags'          => ( $tags && ! is_wp_error( $tags ) ) ? wp_list_pluck( $tags, 'name' ) : array(),
		'completed'     => (bool) $meta['completed'],
		'status'        => $meta['completed'] ? 'Hoàn thành' : 'Đang ra',
		'blurb'         => $blurb,
		// Home hero quote: the editor's own line, else the start of the description.
		'quote'         => $meta['quote'] ? $meta['quote'] : wp_trim_words( $blurb, 18, '…' ),
		'rating'        => $rating,
		'reads'         => $reads,
		'chapters'      => (int) $meta['chapter_count'],
		'free_chapters' => (int) $meta['free_chapters'],
		'updated'       => thu_cac_updated_label( $post ),
		'palette'       => thu_cac_palette( $genre ? $genre->name : '' ),
		'symbol'        => $meta['symbol'] ? $meta['symbol'] : '✦',
		'thumbnail_id'  => get_post_thumbnail_id( $post ),
	);
}

/**
 * Book cover. With a featured image it shows the image; otherwise a generated 2D cover (gradient, screentone,
 * symbol, title).
 *
 * @param array  $story From thu_cac_story().
 * @param string $class Extra class (story-card__cover, detail-cover…).
 * @param array  $args  sizes: the `sizes` attribute for the layout; eager: load first (above the fold).
 */
function thu_cac_cover( $story, $class = '', $args = array() ) {
	$label = sprintf( 'Bìa truyện %s', $story['title'] );
	if ( $story['thumbnail_id'] ) {
		$attrs = array(
			'alt'      => '',
			'loading'  => empty( $args['eager'] ) ? 'lazy' : 'eager',
			'decoding' => 'async',
		);
		if ( ! empty( $args['eager'] ) ) {
			$attrs['fetchpriority'] = 'high';
		}
		if ( ! empty( $args['sizes'] ) ) {
			$attrs['sizes'] = $args['sizes'];
		}
		printf(
			'<div class="book-cover book-cover--image %1$s" role="img" aria-label="%2$s">%3$s</div>',
			esc_attr( $class ),
			esc_attr( $label ),
			wp_get_attachment_image( $story['thumbnail_id'], 'medium_large', false, $attrs )
		);
		return;
	}
	printf(
		'<div class="book-cover %1$s" style="--cover-start:%2$s;--cover-end:%3$s" role="img" aria-label="%4$s"><span class="book-cover__ornament book-cover__ornament--top">TRẠM TRUYỆN 2D</span><span class="book-cover__symbol">%5$s</span><span class="book-cover__title">%6$s</span><span class="book-cover__author">%7$s</span><span class="book-cover__ornament book-cover__ornament--bottom">✦</span></div>',
		esc_attr( $class ),
		esc_attr( sanitize_hex_color( $story['palette'][0] ) ),
		esc_attr( sanitize_hex_color( $story['palette'][1] ) ),
		esc_attr( $label ),
		esc_html( $story['symbol'] ),
		esc_html( $story['title'] ),
		esc_html( $story['author'] )
	);
}

/**
 * Blurred cover behind story and reader pages (the "ambient light" of the story). Generated covers use their
 * gradient instead of an image.
 */
function thu_cac_ambient( $story ) {
	if ( ! $story ) {
		echo '<div class="ambient" aria-hidden="true"></div>';
		return;
	}
	$src = $story['thumbnail_id'] ? wp_get_attachment_image_url( $story['thumbnail_id'], 'medium' ) : '';
	printf(
		'<div class="ambient" aria-hidden="true" style="--cover-start:%1$s;--cover-end:%2$s">%3$s</div>',
		esc_attr( sanitize_hex_color( $story['palette'][0] ) ),
		esc_attr( sanitize_hex_color( $story['palette'][1] ) ),
		$src ? '<img src="' . esc_url( $src ) . '" alt="" decoding="async">' : ''
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

/**
 * The home "departure board": the newest chapter of each of the most recently updated stories (publishing a
 * chapter bumps its story). Titles and numbers only — the same public metadata as the chapter lists, never a body.
 *
 * @param int $limit Rows.
 * @return array<int,array{story:array,number:int,title:string,url:string,time:int,locked:bool}>
 */
function thu_cac_latest_chapters( $limit = 6 ) {
	global $wpdb;
	if ( ! thu_cac_core_active() || ! function_exists( 'storyweb_chapter_url' ) ) {
		return array();
	}
	$stories = thu_cac_stories( array( 'posts_per_page' => $limit ) );
	if ( ! $stories ) {
		return array();
	}
	$ids  = array_map( 'intval', wp_list_pluck( $stories, 'ID' ) );
	$in   = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
	$rows = $wpdb->get_results(
		$wpdb->prepare(
			// phpcs:ignore WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- $in is a list of %d placeholders.
			"SELECT c.post_parent, c.post_title, c.menu_order, c.post_date_gmt
			 FROM {$wpdb->posts} c
			 INNER JOIN ( SELECT post_parent, MAX(menu_order) AS n FROM {$wpdb->posts}
			              WHERE post_type = 'chapter' AND post_status = 'publish' AND menu_order > 0 AND post_parent IN ($in)
			              GROUP BY post_parent ) newest ON newest.post_parent = c.post_parent AND newest.n = c.menu_order
			 WHERE c.post_type = 'chapter' AND c.post_status = 'publish'",
			...$ids
		)
	);
	$by_story = array();
	foreach ( (array) $rows as $row ) {
		$by_story[ (int) $row->post_parent ] = $row;
	}
	$items = array();
	foreach ( $stories as $post ) {
		if ( ! isset( $by_story[ $post->ID ] ) ) {
			continue;
		}
		$row     = $by_story[ $post->ID ];
		$story   = thu_cac_story( $post );
		$number  = (int) $row->menu_order;
		$items[] = array(
			'story'  => $story,
			'number' => $number,
			'title'  => $row->post_title,
			'url'    => storyweb_chapter_url( $post, $number ),
			'time'   => (int) strtotime( $row->post_date_gmt . ' UTC' ),
			'locked' => $number > $story['free_chapters'],
		);
	}
	return $items;
}

/** Board time: "14:05" today, "09/10" earlier this year, else dd/mm/yy. */
function thu_cac_board_time( $time ) {
	if ( ! $time ) {
		return '--:--';
	}
	if ( wp_date( 'Ymd', $time ) === wp_date( 'Ymd' ) ) {
		return wp_date( 'H:i', $time );
	}
	return wp_date( wp_date( 'Y', $time ) === wp_date( 'Y' ) ? 'd/m' : 'd/m/y', $time );
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

/** "Đăng truyện" target: the story list in wp-admin. The link is only shown to users who can edit posts. */
function thu_cac_publish_url() {
	return admin_url( 'edit.php?post_type=story' );
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
