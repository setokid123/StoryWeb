<?php
/**
 * Link previews (Open Graph and Twitter cards) for Zalo, Facebook, Messenger…: title, description and a 1200×630
 * image. Site pages use assets/img/og-image.jpg. A story, and each of its chapters, gets its own card: the story cover
 * pasted into assets/img/og-story-frame.png with the title, author and details written beside it (GD, Be Vietnam
 * Pro), saved once in uploads/thu-cac-share/ and drawn again only when one of those changes. The images are drawn by
 * brand/og-render.mjs; the cover box below must match its HOLE.
 *
 * A chapter shares only its story's public details (title, description, cover), never chapter text, locked or not.
 * Nothing is printed when an SEO plugin prints its own tags.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

/** Bump to redraw every story card (e.g. after changing og-story-frame.png or the text layout). */
const THU_CAC_SHARE_REV = '1';

add_action( 'wp_head', 'thu_cac_share_meta', 5 );

/** Whether an SEO plugin already prints Open Graph tags. */
function thu_cac_share_seo_plugin() {
	return defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'SEOPRESS_VERSION' ) || defined( 'AIOSEO_VERSION' ) || function_exists( 'the_seo_framework' );
}

/** Plain text for meta tags: entities decoded, tags removed, spaces collapsed, cut at `$max` characters. */
function thu_cac_share_text( $text, $max = 0 ) {
	$text = html_entity_decode( wp_strip_all_tags( (string) $text ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$text = trim( preg_replace( '/\s+/u', ' ', $text ) );
	if ( $max && mb_strlen( $text ) > $max ) {
		$text = rtrim( mb_substr( $text, 0, $max - 1 ), " ,.;:-–" ) . '…';
	}
	return $text;
}

/**
 * What this page shares.
 *
 * @return array{type:string,title:string,description:string,url:string,image:array{url:string,width:int,height:int,type:string,alt:string}}
 */
function thu_cac_share_data() {
	$brand = thu_cac_brand_name();
	$site  = array(
		'url'    => get_theme_file_uri( 'assets/img/og-image.jpg' ),
		'width'  => 1200,
		'height' => 630,
		'type'   => 'image/jpeg',
		'alt'    => $brand . ': nghìn câu chuyện hay, luôn ở trong tầm tay.',
	);
	$count = thu_cac_core_active() ? (int) wp_count_posts( 'story' )->publish : 0;
	$data  = array(
		'type'        => 'website',
		'title'       => thu_cac_share_text( wp_get_document_title() ),
		'description' => ( $count ? number_format_i18n( $count ) . ' truyện ngôn tình, đô thị, cổ trang, trọng sinh… ' : '' ) . 'Nghìn câu chuyện hay, luôn ở trong tầm tay. Đọc mượt trên điện thoại, sáng hay tối đều dễ chịu.',
		'url'         => is_front_page() ? home_url( '/' ) : '',
		'image'       => $site,
	);
	if ( is_front_page() ) {
		$data['title'] = $brand . ' · Đọc truyện online';
	}

	$story   = null;
	$chapter = 0;
	if ( thu_cac_core_active() && is_singular( 'story' ) ) {
		$story = get_queried_object();
	} elseif ( thu_cac_core_active() && is_singular( 'chapter' ) ) {
		$post    = get_queried_object();
		$story   = $post ? get_post( $post->post_parent ) : null;
		$chapter = $post ? (int) $post->menu_order : 0;
	}
	if ( ! $story || 'story' !== $story->post_type || 'publish' !== $story->post_status ) {
		return $data;
	}

	$s     = thu_cac_story( $story );
	$title = thu_cac_share_text( $s['title'] );
	$about = thu_cac_share_text( $s['blurb'], 220 );
	$card  = thu_cac_share_card( $story, $s );
	$data  = array(
		'type'        => 'article',
		'title'       => $chapter ? sprintf( 'Chương %d · %s', $chapter, $title ) : $title,
		'description' => $chapter ? thu_cac_share_text( sprintf( 'Đọc chương %d của %s trên %s. %s', $chapter, $title, $brand, $about ), 240 ) : ( '' !== $about ? $about : sprintf( 'Đọc %s trên %s.', $title, $brand ) ),
		'url'         => get_permalink( get_queried_object() ),
		'image'       => $card ? $card + array( 'alt' => sprintf( 'Bìa truyện %s', $title ) ) : $site,
	);
	return $data;
}

function thu_cac_share_meta() {
	if ( thu_cac_share_seo_plugin() ) {
		return;
	}
	$d    = thu_cac_share_data();
	$tags = array(
		array( 'name', 'description', $d['description'] ),
		array( 'property', 'og:site_name', thu_cac_brand_name() ),
		array( 'property', 'og:locale', 'vi_VN' ),
		array( 'property', 'og:type', $d['type'] ),
		array( 'property', 'og:title', $d['title'] ),
		array( 'property', 'og:description', $d['description'] ),
		array( 'property', 'og:url', $d['url'] ),
		array( 'property', 'og:image', $d['image']['url'] ),
		array( 'property', 'og:image:width', (string) $d['image']['width'] ),
		array( 'property', 'og:image:height', (string) $d['image']['height'] ),
		array( 'property', 'og:image:type', $d['image']['type'] ),
		array( 'property', 'og:image:alt', $d['image']['alt'] ),
		array( 'name', 'twitter:card', 'summary_large_image' ),
		array( 'name', 'twitter:title', $d['title'] ),
		array( 'name', 'twitter:description', $d['description'] ),
		array( 'name', 'twitter:image', $d['image']['url'] ),
	);
	foreach ( $tags as list( $attr, $key, $value ) ) {
		if ( '' === (string) $value ) {
			continue;
		}
		$content = 'og:url' === $key || 'og:image' === $key || 'twitter:image' === $key ? esc_url( $value ) : esc_attr( $value );
		printf( '<meta %s="%s" content="%s">' . "\n", $attr, esc_attr( $key ), $content ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $attr is one of two literals; the rest is escaped above.
	}
}

/**
 * The story's card (cover, title, author, details), drawn on first use. Null without a readable cover or GD.
 *
 * @param WP_Post             $story Story.
 * @param array<string,mixed> $s     thu_cac_story( $story ).
 * @return array{url:string,width:int,height:int,type:string}|null
 */
function thu_cac_share_card( $story, $s ) {
	$thumb = (int) $s['thumbnail_id'];
	$file  = $thumb ? get_attached_file( $thumb ) : '';
	if ( ! $file || ! is_readable( $file ) || ! function_exists( 'imagettftext' ) || ! function_exists( 'imagecreatefromstring' ) ) {
		return null;
	}
	$lines = array(
		thu_cac_share_text( $s['title'] ),
		'Tác giả: ' . thu_cac_share_text( $s['author_label'] ),
		implode( ' · ', array_filter( array( $s['chapters'] ? $s['chapters'] . ' chương' : '', $s['status'], thu_cac_share_text( $s['genre'] ) ) ) ),
	);
	$uploads = wp_upload_dir( null, false );
	if ( ! empty( $uploads['error'] ) ) {
		return null;
	}
	$hash = substr( md5( THU_CAC_SHARE_REV . '|' . $thumb . '|' . filemtime( $file ) . '|' . implode( '|', $lines ) ), 0, 12 );
	$name = 'story-' . (int) $story->ID . '-' . $hash . '.jpg';
	$dir  = trailingslashit( $uploads['basedir'] ) . 'thu-cac-share';
	$path = $dir . '/' . $name;
	if ( ! file_exists( $path ) ) {
		if ( ! wp_mkdir_p( $dir ) || ! thu_cac_share_draw( $file, $lines, $path ) ) {
			return null;
		}
		foreach ( (array) glob( $dir . '/story-' . (int) $story->ID . '-*.jpg' ) as $old ) {
			if ( $old !== $path ) {
				wp_delete_file( $old );
			}
		}
	}
	return array(
		'url'    => trailingslashit( $uploads['baseurl'] ) . 'thu-cac-share/' . $name,
		'width'  => 1200,
		'height' => 630,
		'type'   => 'image/jpeg',
	);
}

/** Text width in px for GD (sizes in px; GD takes points at 96 dpi). */
function thu_cac_share_width( $text, $font, $px ) {
	$box = imagettfbbox( $px * 0.75, 0, $font, $text );
	return $box ? abs( $box[2] - $box[0] ) : 0;
}

/**
 * Wraps `$text` into lines no wider than `$max` px, then evens them out (same number of lines, the narrowest width
 * that still fits), so a title never ends on a lonely word.
 *
 * @return string[]
 */
function thu_cac_share_wrap( $text, $font, $px, $max ) {
	$words = preg_split( '/\s+/u', trim( $text ) );
	$wrap  = static function ( $limit ) use ( $words, $font, $px ) {
		$lines = array();
		$line  = '';
		foreach ( $words as $word ) {
			$try = '' === $line ? $word : $line . ' ' . $word;
			if ( '' !== $line && thu_cac_share_width( $try, $font, $px ) > $limit ) {
				$lines[] = $line;
				$line    = $word;
			} else {
				$line = $try;
			}
		}
		$lines[] = $line;
		return $lines;
	};
	$lines = $wrap( $max );
	if ( count( $lines ) > 1 ) {
		$lo = (int) ( $max / 2 );
		$hi = $max;
		while ( $hi - $lo > 8 ) {
			$mid = (int) ( ( $lo + $hi ) / 2 );
			if ( count( $wrap( $mid ) ) === count( $lines ) ) {
				$hi = $mid;
			} else {
				$lo = $mid;
			}
		}
		$lines = $wrap( $hi );
	}
	return $lines;
}

/** Draws the card for `$cover_file` with `$lines` (title, author, details) into `$path` (JPEG). */
function thu_cac_share_draw( $cover_file, $lines, $path ) {
	$frame = @imagecreatefrompng( get_theme_file_path( 'assets/img/og-story-frame.png' ) ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- a bad image just means no card.
	$cover = @imagecreatefromstring( (string) file_get_contents( $cover_file ) ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local upload.
	$bold  = get_theme_file_path( 'assets/fonts/BeVietnamPro-ExtraBold.ttf' );
	$semi  = get_theme_file_path( 'assets/fonts/BeVietnamPro-SemiBold.ttf' );
	if ( ! $frame || ! $cover || ! is_readable( $bold ) || ! is_readable( $semi ) ) {
		return false;
	}
	$card = imagecreatetruecolor( 1200, 630 );
	imagefill( $card, 0, 0, imagecolorallocate( $card, 17, 12, 51 ) );

	// Cover, cropped to fill its box (like object-fit: cover), then the frame on top rounds its corners.
	list( $x, $y, $w, $h ) = array( 84, 66, 346, 498 );
	$cw    = imagesx( $cover );
	$ch    = imagesy( $cover );
	$scale = max( $w / $cw, $h / $ch );
	$sw    = (int) round( $w / $scale );
	$sh    = (int) round( $h / $scale );
	imagecopyresampled( $card, $cover, $x, $y, (int) ( ( $cw - $sw ) / 2 ), (int) ( ( $ch - $sh ) / 2 ), $w, $h, $sw, $sh );
	imagealphablending( $card, true );
	imagecopy( $card, $frame, 0, 0, 0, 0, 1200, 630 );

	// Title: the largest size that fits (54px on two lines, else smaller on three), then author and details.
	$title = $lines[0];
	$left  = 500;
	$max   = 630;
	foreach ( array( array( 54, 2 ), array( 46, 3 ), array( 40, 3 ) ) as list( $px, $most ) ) {
		$rows = thu_cac_share_wrap( $title, $bold, $px, $max );
		if ( count( $rows ) <= $most ) {
			break;
		}
	}
	if ( count( $rows ) > 3 ) {
		$rows    = array_slice( $rows, 0, 3 );
		$last    = $rows[2] . '…';
		while ( mb_strlen( $last ) > 2 && thu_cac_share_width( $last, $bold, $px ) > $max ) {
			$last = rtrim( mb_substr( $last, 0, -2 ) ) . '…';
		}
		$rows[2] = $last;
	}
	$white = imagecolorallocate( $card, 255, 255, 255 );
	$soft  = imagecolorallocate( $card, 217, 210, 255 );
	$line  = (int) round( $px * 1.22 );
	$top   = 168;
	foreach ( $rows as $i => $row ) {
		imagettftext( $card, $px * 0.75, 0, $left, $top + $i * $line + (int) round( $px * 0.98 ), $white, $bold, $row );
	}
	$top += count( $rows ) * $line + 34;
	foreach ( array_slice( $lines, 1 ) as $i => $row ) {
		$fit = $row;
		while ( mb_strlen( $fit ) > 2 && thu_cac_share_width( $fit, $semi, 25 ) > $max ) {
			$fit = rtrim( mb_substr( $fit, 0, -2 ) ) . '…';
		}
		imagettftext( $card, 25 * 0.75, 0, $left, $top + $i * 42 + 25, $soft, $semi, $fit );
	}

	$tmp = $path . '.' . wp_generate_password( 6, false ) . '.tmp';
	$ok  = imagejpeg( $card, $tmp, 86 ) && rename( $tmp, $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.rename_rename -- atomic swap into place.
	if ( ! $ok && file_exists( $tmp ) ) {
		wp_delete_file( $tmp );
	}
	imagedestroy( $card );
	imagedestroy( $cover );
	imagedestroy( $frame );
	return $ok;
}
