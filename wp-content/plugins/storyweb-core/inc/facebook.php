<?php
/**
 * Đăng Facebook: posts a story to the admin's Facebook Page through the Graph API. The story cover is the photo; the
 * text is the story description, the start of chapter 1 or a whole free chapter, with a link back to the site, or
 * that link in a first comment the Page posts right after (from a template; for a scheduled post, by WP-Cron).
 * Only FREE chapters can be a source: a locked chapter must never reach the public, Facebook included.
 *
 * Connection (Truyện → Đăng Facebook, inc/facebook-admin.php): the admin pastes a short-lived User token from the
 * Graph API Explorer with the App ID and App Secret of their Meta "Business" app (Standard Access is enough for a
 * Page they manage, no App Review). The server swaps it for a long-lived User token, lists the Pages it may post to
 * and keeps the chosen Page's token: a Page token obtained from a long-lived User token does not expire. The App
 * Secret and the User tokens are never stored. The Page token sits in a non-autoloaded option and is never printed.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

const STORYWEB_FB_OPTION = 'storyweb_fb';
const STORYWEB_FB_LOG    = 'storyweb_fb_log';
/** Facebook takes up to 63,206 characters in a post; keep a margin. */
const STORYWEB_FB_MAX_TEXT = 60000;
/** Free chapters offered as a source (a story marked "all free" would otherwise list hundreds). */
const STORYWEB_FB_MAX_CHAPTERS = 10;
/** Facebook takes up to 8,000 characters in a comment. */
const STORYWEB_FB_MAX_COMMENT = 8000;
/** First comment template; {placeholders} from storyweb_fb_comment_vars(). */
const STORYWEB_FB_COMMENT_TEMPLATE = "👉 {doc_tiep}: {link_doc_tiep}\n📚 Theo dõi Trạm Truyện 2D để đọc truyện hay mỗi ngày!";
/** Second comment template (off by default). */
const STORYWEB_FB_COMMENT2_TEMPLATE = "🔎 Mã truyện: {ma_truyen}. Gõ mã vào ô tìm kiếm trên web để đọc lại bất cứ lúc nào: {link_trang_chu}\n❤️ Thả tim nếu bạn thích truyện {the_loai} này nhé!";

function storyweb_fb_graph_base() {
	return (string) apply_filters( 'storyweb_fb_graph_base', 'https://graph.facebook.com/v26.0' );
}

/** @return array{page_id:string,page_name:string,page_token:string,connected_at:int,hashtags:string,comment_on:bool,comment_template:string} */
function storyweb_fb_settings() {
	$saved = get_option( STORYWEB_FB_OPTION, array() );
	return array_merge(
		array(
			'page_id'          => '',
			'page_name'        => '',
			'page_token'       => '',
			'connected_at'     => 0,
			'hashtags'         => '#TrạmTruyện2D',
			'comment_on'        => true,
			'comment_template'  => STORYWEB_FB_COMMENT_TEMPLATE,
			'comment2_on'       => false,
			'comment2_template' => STORYWEB_FB_COMMENT2_TEMPLATE,
		),
		is_array( $saved ) ? $saved : array()
	);
}

function storyweb_fb_save_settings( $settings ) {
	update_option( STORYWEB_FB_OPTION, $settings, false );
}

function storyweb_fb_connected() {
	$s = storyweb_fb_settings();
	return '' !== $s['page_id'] && '' !== $s['page_token'];
}

/**
 * One Graph API call. Tokens travel in the query (GET) or the form body (POST), over HTTPS, server to server.
 *
 * @return array<string,mixed>|WP_Error Decoded JSON, or the error Facebook (or the network) gave.
 */
function storyweb_fb_request( $method, $path, $params ) {
	$url  = storyweb_fb_graph_base() . '/' . ltrim( $path, '/' );
	$args = array(
		'timeout' => 45,
		'headers' => array( 'Accept' => 'application/json' ),
	);
	if ( 'GET' === $method ) {
		$response = wp_remote_get( $url . '?' . http_build_query( $params, '', '&', PHP_QUERY_RFC3986 ), $args );
	} else {
		$args['body'] = $params;
		$response     = wp_remote_post( $url, $args );
	}
	if ( is_wp_error( $response ) ) {
		return new WP_Error( 'storyweb_fb_http', 'Không kết nối được tới Facebook: ' . $response->get_error_message() );
	}
	$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
	if ( ! is_array( $data ) ) {
		return new WP_Error( 'storyweb_fb_bad', sprintf( 'Facebook trả về dữ liệu không đọc được (HTTP %d).', (int) wp_remote_retrieve_response_code( $response ) ) );
	}
	if ( isset( $data['error'] ) ) {
		$error = (array) $data['error'];
		return new WP_Error( 'storyweb_fb_api', sprintf( 'Facebook báo lỗi %s: %s', $error['code'] ?? '?', $error['message'] ?? 'không rõ' ) );
	}
	return $data;
}

/**
 * Pages the User token's owner can post to (task CREATE_CONTENT), each with its Page token.
 *
 * @return array<int,array{id:string,name:string,token:string}>|WP_Error
 */
function storyweb_fb_pages_for_user_token( $app_id, $app_secret, $user_token ) {
	$long = storyweb_fb_request(
		'GET',
		'oauth/access_token',
		array(
			'grant_type'        => 'fb_exchange_token',
			'client_id'         => $app_id,
			'client_secret'     => $app_secret,
			'fb_exchange_token' => $user_token,
		)
	);
	if ( is_wp_error( $long ) ) {
		return $long;
	}
	if ( empty( $long['access_token'] ) ) {
		return new WP_Error( 'storyweb_fb_token', 'Facebook không trả về mã dài hạn.' );
	}
	$accounts = storyweb_fb_request(
		'GET',
		'me/accounts',
		array(
			'fields'       => 'id,name,access_token,tasks',
			'limit'        => 100,
			'access_token' => $long['access_token'],
		)
	);
	if ( is_wp_error( $accounts ) ) {
		return $accounts;
	}
	$pages = array();
	foreach ( (array) ( $accounts['data'] ?? array() ) as $page ) {
		if ( empty( $page['id'] ) || empty( $page['access_token'] ) || ! in_array( 'CREATE_CONTENT', (array) ( $page['tasks'] ?? array() ), true ) ) {
			continue;
		}
		$pages[] = array(
			'id'    => (string) $page['id'],
			'name'  => (string) ( $page['name'] ?? $page['id'] ),
			'token' => (string) $page['access_token'],
		);
	}
	if ( ! $pages ) {
		return new WP_Error( 'storyweb_fb_no_page', 'Tài khoản này không có Page nào được phép đăng bài. Kiểm tra lại quyền pages_show_list, pages_read_engagement, pages_manage_posts khi tạo mã.' );
	}
	return $pages;
}

/** Checks a Page ID + Page token pasted directly. @return array{id:string,name:string,token:string}|WP_Error */
function storyweb_fb_check_page_token( $page_id, $page_token ) {
	$page = storyweb_fb_request(
		'GET',
		rawurlencode( $page_id ),
		array(
			'fields'       => 'id,name',
			'access_token' => $page_token,
		)
	);
	if ( is_wp_error( $page ) ) {
		return $page;
	}
	return array(
		'id'    => (string) ( $page['id'] ?? $page_id ),
		'name'  => (string) ( $page['name'] ?? $page_id ),
		'token' => $page_token,
	);
}

/** Plain text from post HTML or bot text: paragraphs kept as blank lines, entities decoded, spaces tidied. */
function storyweb_fb_plain( $html ) {
	$text = preg_replace( '#<br\s*/?>#i', "\n", (string) $html );
	$text = preg_replace( '#</(p|div|h[1-6]|li|blockquote)>#i', "\n\n", $text );
	$text = html_entity_decode( wp_strip_all_tags( $text ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$text = str_replace( array( "\r\n", "\r" ), "\n", $text );
	$text = preg_replace( "/[ \t\x{00A0}]+/u", ' ', $text );
	$text = preg_replace( "/ *\n */", "\n", $text );
	$text = preg_replace( "/\n{3,}/", "\n\n", $text );
	return trim( (string) $text );
}

/** The first paragraphs of `$text`, about `$chars` characters, ending on a paragraph (or sentence) boundary. */
function storyweb_fb_opening( $text, $chars = 1200 ) {
	if ( mb_strlen( $text ) <= $chars ) {
		return $text;
	}
	$out = '';
	foreach ( explode( "\n\n", $text ) as $paragraph ) {
		if ( '' !== $out && mb_strlen( $out ) + mb_strlen( $paragraph ) > $chars ) {
			break;
		}
		$out .= ( '' === $out ? '' : "\n\n" ) . $paragraph;
	}
	if ( mb_strlen( $out ) > $chars * 1.5 ) {
		$cut = mb_substr( $out, 0, $chars );
		$end = max( mb_strrpos( $cut, '. ' ), mb_strrpos( $cut, '! ' ), mb_strrpos( $cut, '? ' ) );
		$out = false !== $end && $end > $chars / 2 ? mb_substr( $cut, 0, $end + 1 ) : $cut;
	}
	return rtrim( $out ) . '…';
}

/**
 * What a story can be posted with: its description, the opening of chapter 1, or a whole free chapter (the first
 * STORYWEB_FB_MAX_CHAPTERS). Locked chapters are never listed. Each source carries its text and the link to read on.
 *
 * @return array<string,array{label:string,chapter:int,text:string,link:string,more:string}>
 */
function storyweb_fb_sources( $story ) {
	$story = get_post( $story );
	if ( ! $story || 'story' !== $story->post_type ) {
		return array();
	}
	$sources = array();
	$about   = storyweb_fb_plain( has_excerpt( $story ) ? $story->post_excerpt : $story->post_content );
	if ( '' !== $about ) {
		$sources['about'] = array(
			'label'   => 'Giới thiệu truyện',
			'chapter' => 0,
			'text'    => $about,
			'link'    => get_permalink( $story ),
			'more'    => 'Đọc truyện',
		);
	}
	$meta = storyweb_story_meta( $story );
	$last = min( (int) $meta['free_chapters'], STORYWEB_FB_MAX_CHAPTERS );
	for ( $n = 1; $n <= $last; $n++ ) {
		$chapter = storyweb_find_chapter( $story->ID, $n );
		if ( ! $chapter || 'publish' !== $chapter->post_status || ! storyweb_chapter_is_free( $chapter ) ) {
			continue;
		}
		$text = storyweb_fb_plain( $chapter->post_content );
		if ( '' === $text ) {
			continue;
		}
		$next = storyweb_find_chapter( $story->ID, $n + 1 );
		if ( 1 === $n ) {
			$sources['start'] = array(
				'label'   => 'Đoạn mở đầu chương 1',
				'chapter' => 1,
				'text'    => storyweb_fb_opening( $text ),
				'link'    => storyweb_chapter_url( $story, 1 ),
				'more'    => 'Đọc tiếp chương 1',
			);
		}
		$sources[ 'chapter-' . $n ] = array(
			'label'   => sprintf( 'Cả chương %d', $n ),
			'chapter' => $n,
			'text'    => $text,
			'link'    => $next ? storyweb_chapter_url( $story, $n + 1 ) : get_permalink( $story ),
			'more'    => $next ? sprintf( 'Đọc tiếp chương %d', $n + 1 ) : 'Xem truyện',
		);
	}
	return $sources;
}

/** Default hashtags for a story: the saved ones plus its genre (spaces removed). */
function storyweb_fb_hashtags( $story ) {
	$tags  = trim( storyweb_fb_settings()['hashtags'] );
	$terms = get_the_terms( $story, 'the_loai' );
	if ( $terms && ! is_wp_error( $terms ) ) {
		$genre = '#' . preg_replace( '/[^\p{L}\p{N}_]+/u', '', $terms[0]->name );
		if ( '#' !== $genre && false === mb_stripos( $tags, $genre ) ) {
			$tags = trim( $tags . ' ' . $genre );
		}
	}
	return $tags;
}

/**
 * The post text for `$source`: title, (chapter), text, "read on" link (left out when the first comment carries it),
 * hashtags; cut to Facebook's limit.
 */
function storyweb_fb_message( $story, $source, $with_link = true ) {
	$title = html_entity_decode( get_the_title( $story ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$head  = '📖 ' . $title . ( $source['chapter'] ? ' · Chương ' . $source['chapter'] : '' );
	$tags  = storyweb_fb_hashtags( $story );
	$foot  = $with_link ? "\n\n👉 " . $source['more'] . ': ' . $source['link'] : '';
	$foot .= '' !== $tags ? ( $with_link ? "\n" : "\n\n" ) . $tags : '';
	$room  = STORYWEB_FB_MAX_TEXT - mb_strlen( $head ) - mb_strlen( $foot ) - 2;
	$text  = $source['text'];
	if ( mb_strlen( $text ) > $room ) {
		$text = rtrim( mb_substr( $text, 0, $room - 1 ) ) . '…';
	}
	return $head . "\n\n" . $text . $foot;
}

/**
 * Public URL of the cover as a JPEG (Facebook fetches it). Covers are WebP: a JPEG copy is made once in
 * uploads/storyweb-fb/. '' without a cover.
 */
function storyweb_fb_cover_url( $story ) {
	$thumb = (int) get_post_thumbnail_id( $story );
	$file  = $thumb ? get_attached_file( $thumb ) : '';
	if ( ! $file || ! is_readable( $file ) ) {
		return '';
	}
	if ( preg_match( '/\.jpe?g$/i', $file ) ) {
		return (string) wp_get_attachment_url( $thumb );
	}
	$uploads = wp_upload_dir( null, false );
	if ( ! empty( $uploads['error'] ) ) {
		return (string) wp_get_attachment_url( $thumb );
	}
	$name = sprintf( 'cover-%d-%d-%d.jpg', get_post( $story )->ID, $thumb, (int) filemtime( $file ) );
	$dir  = trailingslashit( $uploads['basedir'] ) . 'storyweb-fb';
	$path = $dir . '/' . $name;
	if ( ! file_exists( $path ) ) {
		$editor = wp_mkdir_p( $dir ) ? wp_get_image_editor( $file ) : new WP_Error( 'storyweb_fb_dir', '' );
		if ( is_wp_error( $editor ) ) {
			return (string) wp_get_attachment_url( $thumb );
		}
		$editor->set_quality( 90 );
		if ( is_wp_error( $editor->save( $path, 'image/jpeg' ) ) ) {
			return (string) wp_get_attachment_url( $thumb );
		}
	}
	return trailingslashit( $uploads['baseurl'] ) . 'storyweb-fb/' . $name;
}

/**
 * Posts to the connected Page: a photo post (cover + text) or, without a cover, a text post with the story link.
 * `$when` = Unix time to schedule (10 minutes to 30 days ahead), or 0 for now.
 *
 * @return array{post_id:string,scheduled:int}|WP_Error
 */
function storyweb_fb_publish( $story, $message, $with_cover, $when = 0 ) {
	$s = storyweb_fb_settings();
	if ( ! storyweb_fb_connected() ) {
		return new WP_Error( 'storyweb_fb_not_connected', 'Chưa kết nối Page Facebook.' );
	}
	$message = trim( (string) $message );
	if ( '' === $message ) {
		return new WP_Error( 'storyweb_fb_empty', 'Nội dung bài đăng đang trống.' );
	}
	$params = array( 'access_token' => $s['page_token'] );
	if ( $when ) {
		$params['published']              = 'false';
		$params['scheduled_publish_time'] = (int) $when;
	}
	$cover = $with_cover ? storyweb_fb_cover_url( $story ) : '';
	if ( $cover ) {
		$result = storyweb_fb_request( 'POST', rawurlencode( $s['page_id'] ) . '/photos', $params + array( 'url' => $cover, 'caption' => $message ) );
		$id     = is_wp_error( $result ) ? '' : (string) ( $result['post_id'] ?? $result['id'] ?? '' );
	} else {
		$result = storyweb_fb_request( 'POST', rawurlencode( $s['page_id'] ) . '/feed', $params + array( 'message' => $message, 'link' => get_permalink( $story ) ) );
		$id     = is_wp_error( $result ) ? '' : (string) ( $result['id'] ?? '' );
	}
	if ( is_wp_error( $result ) ) {
		return $result;
	}
	return array(
		'post_id'   => $id,
		'scheduled' => (int) $when,
	);
}

/** Values for the first comment template's {placeholders}. @return array<string,string> */
function storyweb_fb_comment_vars( $story, $source ) {
	$terms = get_the_terms( $story, 'the_loai' );
	return array(
		'ten_truyen'     => html_entity_decode( get_the_title( $story ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
		'ma_truyen'      => function_exists( 'storyweb_story_code' ) ? storyweb_story_code( $story ) : '',
		'the_loai'       => $terms && ! is_wp_error( $terms ) ? mb_strtolower( $terms[0]->name ) : '',
		'doc_tiep'       => $source['more'],
		'link_doc_tiep'  => $source['link'],
		'link_truyen'    => get_permalink( $story ),
		'link_trang_chu' => home_url( '/' ),
	);
}

/**
 * The comments of a new post, in order: now, or for a post Facebook publishes at `$when`, by WP-Cron 2, 3…
 * minutes after it goes live. Stops at the first refused comment.
 *
 * @param string[] $comments Texts; empty ones are skipped.
 * @return array{status:string,ok:bool} Status for the history and the notice.
 */
function storyweb_fb_post_comments( $post_id, $comments, $when = 0 ) {
	$comments = array_values( array_filter( array_map( 'trim', (array) $comments ), 'strlen' ) );
	if ( ! $comments || '' === (string) $post_id ) {
		return array( 'status' => '', 'ok' => true );
	}
	if ( $when ) {
		foreach ( $comments as $i => $comment ) {
			storyweb_fb_schedule_comment( $post_id, $comment, $when + $i * MINUTE_IN_SECONDS );
		}
		return array( 'status' => sprintf( '%d bình luận sẽ được gửi vài phút sau khi bài lên', count( $comments ) ), 'ok' => true );
	}
	$done = 0;
	foreach ( $comments as $comment ) {
		$result = storyweb_fb_comment( $post_id, $comment );
		if ( is_wp_error( $result ) ) {
			return array( 'status' => ( $done ? sprintf( 'Đã bình luận %d, ', $done ) : '' ) . 'Lỗi: ' . $result->get_error_message(), 'ok' => false );
		}
		++$done;
	}
	return array( 'status' => 1 === $done ? 'Đã bình luận' : sprintf( 'Đã bình luận %d lần', $done ), 'ok' => true );
}

/** `$template` with {placeholders} filled in. */
function storyweb_fb_render_comment( $template, $vars ) {
	$pairs = array();
	foreach ( $vars as $key => $value ) {
		$pairs[ '{' . $key . '}' ] = $value;
	}
	return trim( strtr( (string) $template, $pairs ) );
}

/**
 * Comments on a post (or photo) as the Page. Needs the pages_manage_engagement permission.
 *
 * @return string|WP_Error The comment ID.
 */
function storyweb_fb_comment( $object_id, $message ) {
	$s       = storyweb_fb_settings();
	$message = trim( (string) $message );
	if ( ! storyweb_fb_connected() || '' === $message || '' === (string) $object_id ) {
		return new WP_Error( 'storyweb_fb_comment', 'Thiếu bài hoặc nội dung bình luận.' );
	}
	$result = storyweb_fb_request(
		'POST',
		rawurlencode( (string) $object_id ) . '/comments',
		array(
			'access_token' => $s['page_token'],
			'message'      => mb_substr( $message, 0, STORYWEB_FB_MAX_COMMENT ),
		)
	);
	if ( is_wp_error( $result ) ) {
		return new WP_Error( $result->get_error_code(), $result->get_error_message() . ' (Page cần quyền pages_manage_engagement: thêm quyền cho app, lấy mã mới rồi kết nối lại.)' );
	}
	return (string) ( $result['id'] ?? '' );
}

// A scheduled post can only be commented on once Facebook has published it: WP-Cron comments a little later.
add_action(
	'storyweb_fb_scheduled_comment',
	static function ( $object_id, $message ) {
		$result = storyweb_fb_comment( $object_id, $message );
		storyweb_fb_log_update( $object_id, array( 'comment' => is_wp_error( $result ) ? 'Lỗi: ' . $result->get_error_message() : 'Đã bình luận' ) );
	},
	10,
	2
);

/** Schedules the first comment of a post that Facebook publishes at `$when`. */
function storyweb_fb_schedule_comment( $object_id, $message, $when ) {
	wp_schedule_single_event( (int) $when + 2 * MINUTE_IN_SECONDS, 'storyweb_fb_scheduled_comment', array( (string) $object_id, (string) $message ) );
}

/** Updates the "Đã đăng" row of `$post_id`. */
function storyweb_fb_log_update( $post_id, $fields ) {
	$log = get_option( STORYWEB_FB_LOG, array() );
	foreach ( is_array( $log ) ? $log : array() as $i => $row ) {
		if ( (string) $row['post_id'] === (string) $post_id ) {
			$log[ $i ] = array_merge( $row, $fields );
			update_option( STORYWEB_FB_LOG, $log, false );
			return;
		}
	}
}

/** Remembers a post for the "Đã đăng" list (newest first, last 30). */
function storyweb_fb_log( $story, $label, $post_id, $scheduled, $comment = '' ) {
	$log = get_option( STORYWEB_FB_LOG, array() );
	$log = is_array( $log ) ? $log : array();
	array_unshift(
		$log,
		array(
			'time'      => time(),
			'story'     => (int) get_post( $story )->ID,
			'source'    => (string) $label,
			'post_id'   => (string) $post_id,
			'scheduled' => (int) $scheduled,
			'comment'   => (string) $comment,
		)
	);
	update_option( STORYWEB_FB_LOG, array_slice( $log, 0, 30 ), false );
	if ( function_exists( 'storyweb_fb_mark_posted' ) ) {
		storyweb_fb_mark_posted( get_post( $story )->ID );
	}
}
