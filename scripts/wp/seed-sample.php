<?php
/**
 * Throwaway sample content for a LOCAL WordPress Playground site (see scripts/wp/README.md). Never run on a real site.
 * Reads sample-stories.json (StoryWeb's former src/data/stories.ts). Each chapter body ends with a marker
 * "SW-<slug>-<n>-BODY" so the checks can prove locked text never leaks.
 *
 * @package StoryWebCore
 */

if ( get_option( 'sw_seeded' ) || ! function_exists( 'storyweb_refresh_story_counters' ) ) {
	return;
}
$data = json_decode( (string) file_get_contents( __DIR__ . '/sample-stories.json' ), true );
foreach ( $data['stories'] as $i => $s ) {
	$genre = term_exists( $s['genre'], 'the_loai' );
	if ( ! $genre ) {
		$genre = wp_insert_term( $s['genre'], 'the_loai', array( 'slug' => sanitize_title( $s['genre'] ) ) );
	}
	$id = wp_insert_post(
		array(
			'post_type'    => 'story',
			'post_status'  => 'publish',
			'post_title'   => $s['title'],
			'post_name'    => $s['slug'],
			'post_content' => $s['blurb'],
			'post_excerpt' => $s['blurb'],
		),
		true
	);
	if ( is_wp_error( $id ) ) {
		continue;
	}
	wp_set_object_terms( $id, array( (int) $genre['term_id'] ), 'the_loai' );
	wp_set_object_terms( $id, $s['tags'], 'post_tag' );
	update_post_meta( $id, '_sw_author', $s['author'] );
	update_post_meta( $id, '_sw_free_chapters', (int) $s['freeChapters'] );
	update_post_meta( $id, '_sw_completed', 'Hoàn thành' === $s['status'] );
	update_post_meta( $id, '_sw_featured', ! empty( $s['featured'] ) );
	update_post_meta( $id, '_sw_symbol', $s['symbol'] );
	update_post_meta( $id, '_sw_rating', $s['rating'] );
	update_post_meta( $id, '_sw_reads', $s['reads'] );
	if ( ! empty( $s['featured'] ) ) {
		update_post_meta( $id, '_sw_quote', $data['featuredQuote'] );
	}
	// The first story gets 120 chapters (exercises the 100-per-page chapter list); the others 6.
	$count = 0 === $i ? 120 : 6;
	for ( $n = 1; $n <= $count; $n++ ) {
		wp_insert_post(
			array(
				'post_type'    => 'chapter',
				'post_status'  => 'publish',
				'post_parent'  => $id,
				'menu_order'   => $n,
				'post_title'   => $data['chapterTitles'][ $n - 1 ] ?? ( 'Chương ' . $n . ': Một trang mới' ),
				'post_content' => implode( "\n\n", array_merge( $data['paragraphs'], $data['paragraphs'] ) ) . "\n\nMã kiểm tra: SW-" . $s['slug'] . '-' . $n . '-BODY',
			)
		);
	}
	storyweb_refresh_story_counters( $id );
}
update_option( 'sw_seeded', 1 );
flush_rewrite_rules();
