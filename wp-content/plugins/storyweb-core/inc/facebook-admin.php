<?php
/**
 * wp-admin → Truyện → Đăng Facebook (administrators): connect a Page, then pick a story, a source (description,
 * opening of chapter 1, a whole free chapter), edit the text and post it with the cover, now or at a set time, with
 * an optional first comment from a template (the "read on" link then moves from the post to the comment).
 * Also a "Đăng Facebook" link under each story in Truyện → Tất cả truyện. Logic in inc/facebook.php.
 * "Tạo bài để tự đăng" makes the same post as a kit to post by hand (text, cover JPEG, comments, each with a copy
 * button); nothing goes to Facebook, so it works without a connected Page. Stories marked as posted by hand show it
 * in the picker.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

/** Story meta: when the story was last marked as posted by hand ("Đánh dấu đã đăng tay"). */
const STORYWEB_FB_META_MANUAL = '_sw_fb_manual_at';

add_action(
	'admin_menu',
	static function () {
		add_submenu_page( 'edit.php?post_type=story', 'Đăng Facebook', 'Đăng Facebook', 'manage_options', 'storyweb-facebook', 'storyweb_fb_admin_page' );
	}
);

add_filter(
	'post_row_actions',
	static function ( $actions, $post ) {
		if ( 'story' === $post->post_type && 'publish' === $post->post_status && current_user_can( 'manage_options' ) ) {
			$actions['storyweb_fb'] = sprintf( '<a href="%s">Đăng Facebook</a>', esc_url( storyweb_fb_admin_url( array( 'story' => $post->ID ) ) ) );
		}
		return $actions;
	},
	10,
	2
);

add_action( 'admin_post_storyweb_fb_connect', 'storyweb_fb_admin_connect' );
add_action( 'admin_post_storyweb_fb_choose', 'storyweb_fb_admin_choose' );
add_action( 'admin_post_storyweb_fb_disconnect', 'storyweb_fb_admin_disconnect' );
add_action( 'admin_post_storyweb_fb_publish', 'storyweb_fb_admin_publish' );
add_action( 'admin_post_storyweb_fb_manual', 'storyweb_fb_admin_manual' );

function storyweb_fb_admin_url( $args = array() ) {
	return add_query_arg( array_merge( array( 'post_type' => 'story', 'page' => 'storyweb-facebook' ), $args ), admin_url( 'edit.php' ) );
}

function storyweb_fb_admin_guard( $action ) {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Bạn không có quyền.', '', array( 'response' => 403 ) );
	}
	check_admin_referer( $action );
}

/** One-shot message for the next page view (kept per user, so nothing lands in the URL). */
function storyweb_fb_notice( $type, $text, $link = '' ) {
	set_transient( 'storyweb_fb_notice_' . get_current_user_id(), compact( 'type', 'text', 'link' ), 120 );
}

function storyweb_fb_back( $args = array() ) {
	wp_safe_redirect( storyweb_fb_admin_url( $args ) );
	exit;
}

/** POSTed text field: unslashed, tags removed, spaces trimmed. */
function storyweb_fb_field( $key ) {
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- every caller checked the nonce first.
	return isset( $_POST[ $key ] ) ? trim( sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) ) : '';
}

function storyweb_fb_admin_connect() {
	storyweb_fb_admin_guard( 'storyweb_fb_connect' );
	$page_id    = storyweb_fb_field( 'page_id' );
	$page_token = storyweb_fb_field( 'page_token' );
	if ( '' !== $page_id && '' !== $page_token ) {
		$page = storyweb_fb_check_page_token( $page_id, $page_token );
		if ( is_wp_error( $page ) ) {
			storyweb_fb_notice( 'error', $page->get_error_message() );
			storyweb_fb_back();
		}
		storyweb_fb_use_page( $page );
	}
	$app_id     = storyweb_fb_field( 'app_id' );
	$app_secret = storyweb_fb_field( 'app_secret' );
	$user_token = storyweb_fb_field( 'user_token' );
	if ( '' === $app_id || '' === $app_secret || '' === $user_token ) {
		storyweb_fb_notice( 'error', 'Cần đủ App ID, App Secret và mã truy cập người dùng (hoặc Page ID cùng mã của Page).' );
		storyweb_fb_back();
	}
	$pages = storyweb_fb_pages_for_user_token( $app_id, $app_secret, $user_token );
	if ( is_wp_error( $pages ) ) {
		storyweb_fb_notice( 'error', $pages->get_error_message() );
		storyweb_fb_back();
	}
	if ( 1 === count( $pages ) ) {
		storyweb_fb_use_page( $pages[0] );
	}
	// Several Pages: keep them (with their tokens) for ten minutes while the admin picks one.
	set_transient( 'storyweb_fb_pages_' . get_current_user_id(), $pages, 10 * MINUTE_IN_SECONDS );
	storyweb_fb_back();
}

function storyweb_fb_admin_choose() {
	storyweb_fb_admin_guard( 'storyweb_fb_choose' );
	$key   = 'storyweb_fb_pages_' . get_current_user_id();
	$pages = get_transient( $key );
	$id    = storyweb_fb_field( 'page' );
	delete_transient( $key );
	foreach ( is_array( $pages ) ? $pages : array() as $page ) {
		if ( $page['id'] === $id ) {
			storyweb_fb_use_page( $page );
		}
	}
	storyweb_fb_notice( 'error', 'Hết thời gian chọn Page, hãy kết nối lại.' );
	storyweb_fb_back();
}

/** Saves the Page and returns to the composer. Never returns. */
function storyweb_fb_use_page( $page ) {
	$s                 = storyweb_fb_settings();
	$s['page_id']      = $page['id'];
	$s['page_name']    = $page['name'];
	$s['page_token']   = $page['token'];
	$s['connected_at'] = time();
	storyweb_fb_save_settings( $s );
	storyweb_fb_notice( 'success', sprintf( 'Đã kết nối Page "%s". Giờ chọn truyện để đăng.', $page['name'] ) );
	storyweb_fb_back();
}

function storyweb_fb_admin_disconnect() {
	storyweb_fb_admin_guard( 'storyweb_fb_disconnect' );
	$s = storyweb_fb_settings();
	storyweb_fb_save_settings( array_merge( $s, array( 'page_id' => '', 'page_name' => '', 'page_token' => '', 'connected_at' => 0 ) ) );
	storyweb_fb_notice( 'success', 'Đã ngắt kết nối Page. Mã của Page đã được xóa khỏi site.' );
	storyweb_fb_back();
}

function storyweb_fb_admin_publish() {
	storyweb_fb_admin_guard( 'storyweb_fb_publish' );
	// phpcs:disable WordPress.Security.NonceVerification.Missing -- checked in storyweb_fb_admin_guard().
	$story   = get_post( isset( $_POST['story'] ) ? absint( $_POST['story'] ) : 0 );
	$source  = storyweb_fb_field( 'source' );
	$message = isset( $_POST['message'] ) ? wp_check_invalid_utf8( wp_strip_all_tags( wp_unslash( $_POST['message'] ) ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- plain text: tags stripped, invalid UTF-8 dropped; kept otherwise as typed (links with %, line breaks).
	$cover   = ! empty( $_POST['with_cover'] );
	$when    = storyweb_fb_field( 'when' );
	$tags    = storyweb_fb_field( 'hashtags_default' );
	// Comments: the texts to post now, and the templates the composer fills in for the next posts.
	$comment_on  = ! empty( $_POST['comment_on'] );
	$comment     = storyweb_fb_text_field( 'comment' );
	$comment2_on = ! empty( $_POST['comment2_on'] );
	$comment2    = storyweb_fb_text_field( 'comment2' );
	// phpcs:enable
	if ( ! $story || 'story' !== $story->post_type || 'publish' !== $story->post_status ) {
		storyweb_fb_notice( 'error', 'Không tìm thấy truyện.' );
		storyweb_fb_back();
	}
	$sources = storyweb_fb_sources( $story );
	if ( ! isset( $sources[ $source ] ) ) {
		storyweb_fb_notice( 'error', 'Nguồn nội dung không hợp lệ: chỉ đăng được giới thiệu truyện hoặc chương miễn phí.' );
		storyweb_fb_back( array( 'story' => $story->ID ) );
	}
	$at = 0;
	if ( '' !== $when ) {
		try {
			$at = ( new DateTimeImmutable( $when, wp_timezone() ) )->getTimestamp();
		} catch ( Exception $e ) {
			$at = -1;
		}
		if ( $at < time() + 10 * MINUTE_IN_SECONDS || $at > time() + STORYWEB_FB_SCHEDULE_AHEAD ) {
			storyweb_fb_notice( 'error', 'Giờ hẹn phải cách bây giờ từ 10 phút đến 75 ngày.' );
			storyweb_fb_back( array( 'story' => $story->ID ) );
		}
	}
	if ( mb_strlen( $message ) > STORYWEB_FB_MAX_TEXT ) {
		$message = mb_substr( $message, 0, STORYWEB_FB_MAX_TEXT - 1 ) . '…';
	}
	storyweb_fb_remember_post_settings( $tags );

	$result = storyweb_fb_publish( $story, $message, $cover, $at );
	if ( is_wp_error( $result ) ) {
		storyweb_fb_notice( 'error', $result->get_error_message() );
		storyweb_fb_back( array( 'story' => $story->ID ) );
	}
	$title    = get_the_title( $story );
	$text     = $at ? sprintf( 'Đã hẹn đăng "%s" lúc %s.', $title, wp_date( 'H:i d/m/Y', $at ) ) : sprintf( 'Đã đăng "%s" lên Page.', $title );
	$comments = storyweb_fb_post_comments( $result['post_id'], array( $comment_on ? $comment : '', $comment2_on ? $comment2 : '' ), $at );
	if ( '' !== $comments['status'] ) {
		$text .= $comments['ok'] ? ' ' . $comments['status'] . '.' : ' Nhưng chưa bình luận xong. ' . $comments['status'];
	}
	storyweb_fb_log( $story, $sources[ $source ]['label'], $result['post_id'], $at, $comments['status'] );
	storyweb_fb_notice( $comments['ok'] ? 'success' : 'warning', $text, $result['post_id'] ? 'https://www.facebook.com/' . rawurlencode( $result['post_id'] ) : '' );
	storyweb_fb_back( array( 'story' => $story->ID ) );
}

/** "Đánh dấu đã đăng tay": a post made by hand from the kit goes into the history and the story is marked. */
function storyweb_fb_admin_manual() {
	storyweb_fb_admin_guard( 'storyweb_fb_manual' );
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- checked in storyweb_fb_admin_guard().
	$story = get_post( isset( $_POST['story'] ) ? absint( $_POST['story'] ) : 0 );
	if ( ! $story || 'story' !== $story->post_type || 'publish' !== $story->post_status ) {
		storyweb_fb_notice( 'error', 'Không tìm thấy truyện.' );
		storyweb_fb_back();
	}
	$sources = storyweb_fb_sources( $story );
	$source  = storyweb_fb_field( 'source' );
	storyweb_fb_log( $story, isset( $sources[ $source ] ) ? $sources[ $source ]['label'] : 'Tự đăng', '', 0, 'Tự đăng tay' );
	update_post_meta( $story->ID, STORYWEB_FB_META_MANUAL, time() );
	storyweb_fb_notice( 'success', sprintf( 'Đã ghi "%s" là đã tự đăng. Chọn truyện tiếp theo.', get_the_title( $story ) ) );
	storyweb_fb_back();
}

/** POSTed plain text (message, comment, template): tags stripped, invalid UTF-8 dropped, kept otherwise as typed. */
function storyweb_fb_text_field( $key ) {
	// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- callers checked the nonce; plain text, links with % and line breaks kept.
	return isset( $_POST[ $key ] ) ? trim( wp_check_invalid_utf8( wp_strip_all_tags( wp_unslash( $_POST[ $key ] ) ) ) ) : '';
}

/** Remembers the choices of the post form (hashtags, comments on/off and their templates) for the next posts. */
function storyweb_fb_remember_post_settings( $tags ) {
	// phpcs:disable WordPress.Security.NonceVerification.Missing -- callers checked the nonce.
	$s                = storyweb_fb_settings();
	$s['hashtags']    = '' !== $tags ? $tags : $s['hashtags'];
	$s['comment_on']  = ! empty( $_POST['comment_on'] );
	$s['comment2_on'] = ! empty( $_POST['comment2_on'] );
	if ( isset( $_POST['comment_template'] ) ) {
		$template              = storyweb_fb_text_field( 'comment_template' );
		$s['comment_template'] = '' !== $template ? $template : STORYWEB_FB_COMMENT_TEMPLATE;
	}
	if ( isset( $_POST['comment2_template'] ) ) {
		$template               = storyweb_fb_text_field( 'comment2_template' );
		$s['comment2_template'] = '' !== $template ? $template : STORYWEB_FB_COMMENT2_TEMPLATE;
	}
	// phpcs:enable
	storyweb_fb_save_settings( $s );
}

function storyweb_fb_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Bạn không có quyền.', '', array( 'response' => 403 ) );
	}
	$s      = storyweb_fb_settings();
	$notice = get_transient( 'storyweb_fb_notice_' . get_current_user_id() );
	delete_transient( 'storyweb_fb_notice_' . get_current_user_id() );
	$pages = get_transient( 'storyweb_fb_pages_' . get_current_user_id() );
	// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only navigation (which story, search words).
	$story_id = isset( $_GET['story'] ) ? absint( $_GET['story'] ) : 0;
	$search   = isset( $_GET['q'] ) ? sanitize_text_field( wp_unslash( $_GET['q'] ) ) : '';
	$edit     = isset( $_GET['sua'] ) ? preg_replace( '/[^0-9_]/', '', (string) wp_unslash( $_GET['sua'] ) ) : '';
	// phpcs:enable
	storyweb_fb_backfill_posts();
	?>
	<div class="wrap storyweb-fb">
		<h1>Đăng truyện lên Facebook</h1>
		<?php if ( is_array( $notice ) ) : ?>
			<div class="notice notice-<?php echo esc_attr( in_array( $notice['type'], array( 'success', 'warning' ), true ) ? $notice['type'] : 'error' ); ?> is-dismissible"><p><?php echo esc_html( $notice['text'] ); ?>
				<?php if ( ! empty( $notice['link'] ) ) : ?>
					<a href="<?php echo esc_url( $notice['link'] ); ?>" target="_blank" rel="noopener">Xem bài trên Facebook</a>
				<?php endif; ?>
			</p></div>
		<?php endif; ?>

		<?php if ( is_array( $pages ) && $pages ) : ?>
			<h2>Chọn Page để đăng</h2>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="storyweb_fb_choose">
				<?php wp_nonce_field( 'storyweb_fb_choose' ); ?>
				<?php foreach ( $pages as $i => $page ) : ?>
					<p><label><input type="radio" name="page" value="<?php echo esc_attr( $page['id'] ); ?>" <?php checked( 0, $i ); ?>> <?php echo esc_html( $page['name'] ); ?> <code><?php echo esc_html( $page['id'] ); ?></code></label></p>
				<?php endforeach; ?>
				<?php submit_button( 'Dùng Page này' ); ?>
			</form>
		<?php elseif ( ! storyweb_fb_connected() ) : ?>
			<?php storyweb_fb_admin_connect_form(); ?>
			<hr style="margin:28px 0">
			<?php
			// No Page connected (or Facebook holding the app): the kit to post by hand still works.
			$story = $story_id ? get_post( $story_id ) : null;
			if ( $story && 'story' === $story->post_type && 'publish' === $story->post_status ) {
				storyweb_fb_admin_composer( $story, $s, false );
			} else {
				echo '<h2>Tạo bài để tự đăng</h2><p class="description">Không cần kết nối Page: chọn truyện, bấm <strong>Tạo bài để tự đăng</strong>, rồi chép nội dung, ảnh và bình luận lên Facebook.</p>';
				storyweb_fb_admin_picker( $search );
			}
			storyweb_fb_admin_history();
			?>
		<?php else : ?>
			<p>Đang đăng lên Page <strong><?php echo esc_html( $s['page_name'] ); ?></strong> <code><?php echo esc_html( $s['page_id'] ); ?></code>, kết nối lúc <?php echo esc_html( wp_date( 'H:i d/m/Y', (int) $s['connected_at'] ) ); ?>.</p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-bottom:16px">
				<input type="hidden" name="action" value="storyweb_fb_disconnect">
				<?php wp_nonce_field( 'storyweb_fb_disconnect' ); ?>
				<button type="submit" class="button button-link-delete" onclick="return confirm('Ngắt kết nối Page?')">Ngắt kết nối</button>
			</form>
			<?php
			$story = $story_id ? get_post( $story_id ) : null;
			if ( '' !== $edit ) {
				storyweb_fb_admin_editor( $edit );
			} elseif ( $story && 'story' === $story->post_type && 'publish' === $story->post_status ) {
				storyweb_fb_admin_composer( $story, $s );
				storyweb_fb_admin_story_posts( $story );
			} else {
				storyweb_fb_admin_picker( $search );
				storyweb_fb_admin_queue( $s );
			}
			storyweb_fb_admin_history();
			?>
		<?php endif; ?>
	</div>
	<?php
}

function storyweb_fb_admin_connect_form() {
	?>
	<h2>Kết nối Page Facebook</h2>
	<ol>
		<li>Vào <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener">developers.facebook.com/apps</a>, tạo app loại <strong>Doanh nghiệp (Business)</strong>. Bạn phải là quản trị viên của Page.</li>
		<li>Trong app, mục <strong>Cài đặt ứng dụng → Thông tin cơ bản</strong>: chép <strong>ID ứng dụng</strong> và <strong>Khóa bí mật</strong>.</li>
		<li>Mở <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener">Graph API Explorer</a>, chọn app vừa tạo, thêm quyền <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_posts</code>, bấm <strong>Generate Access Token</strong>, cho phép Page của bạn, rồi chép mã.</li>
		<li>Dán ba thứ vào đây. Site đổi mã sang mã dài hạn và chỉ giữ mã của Page (không hết hạn trừ khi bạn đổi mật khẩu Facebook hoặc gỡ quyền app). Khóa bí mật không được lưu.</li>
	</ol>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" autocomplete="off">
		<input type="hidden" name="action" value="storyweb_fb_connect">
		<?php wp_nonce_field( 'storyweb_fb_connect' ); ?>
		<table class="form-table" role="presentation">
			<tr><th scope="row"><label for="sw-fb-app">ID ứng dụng (App ID)</label></th><td><input id="sw-fb-app" name="app_id" class="regular-text code" inputmode="numeric"></td></tr>
			<tr><th scope="row"><label for="sw-fb-secret">Khóa bí mật (App Secret)</label></th><td><input id="sw-fb-secret" name="app_secret" type="password" class="regular-text code"></td></tr>
			<tr><th scope="row"><label for="sw-fb-user">Mã truy cập người dùng</label></th><td><textarea id="sw-fb-user" name="user_token" rows="3" class="large-text code"></textarea></td></tr>
		</table>
		<details>
			<summary>Đã có sẵn mã của Page?</summary>
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label for="sw-fb-page">Page ID</label></th><td><input id="sw-fb-page" name="page_id" class="regular-text code" inputmode="numeric"></td></tr>
				<tr><th scope="row"><label for="sw-fb-ptoken">Mã truy cập của Page</label></th><td><textarea id="sw-fb-ptoken" name="page_token" rows="3" class="large-text code"></textarea><p class="description">Điền hai ô này thì không cần ba ô phía trên.</p></td></tr>
			</table>
		</details>
		<?php submit_button( 'Kết nối' ); ?>
	</form>
	<?php
}

/**
 * Stories for the picker, best first. A code ("TT2D1", "tt2d01", "1") lists that story, then every code that starts
 * with those digits, smallest first (TT2D1, TT2D10…TT2D19, TT2D100…); words search the titles, best match first;
 * nothing typed lists every story by code, smallest first.
 *
 * @return int[]
 */
function storyweb_fb_find_stories( $search ) {
	global $wpdb;
	$prefix  = defined( 'STORYWEB_CODE_PREFIX' ) ? STORYWEB_CODE_PREFIX : 'TT2D';
	$search  = trim( (string) $search );
	$by_code = static function ( $digits ) use ( $wpdb, $prefix ) {
		return array_map(
			'intval',
			$wpdb->get_col(
				$wpdb->prepare(
					"SELECT p.ID FROM {$wpdb->postmeta} m JOIN {$wpdb->posts} p ON p.ID = m.post_id WHERE m.meta_key = %s AND m.meta_value LIKE %s AND p.post_type = 'story' AND p.post_status = 'publish' ORDER BY CAST(SUBSTRING(m.meta_value, %d) AS UNSIGNED) ASC, p.ID ASC",
					defined( 'STORYWEB_META_CODE' ) ? STORYWEB_META_CODE : '_sw_code',
					$wpdb->esc_like( $prefix . $digits ) . '%',
					strlen( $prefix ) + 1
				)
			)
		);
	};
	if ( '' === $search || 0 === strcasecmp( $search, $prefix ) ) {
		return $by_code( '' );
	}
	if ( preg_match( '/^(?:' . preg_quote( $prefix, '/' ) . ')?\s*0*(\d{1,6})$/i', $search, $m ) ) {
		return $by_code( $m[1] );
	}
	return array_map(
		'intval',
		get_posts(
			array(
				'post_type'      => 'story',
				'post_status'    => 'publish',
				's'              => $search,
				'orderby'        => 'relevance',
				'posts_per_page' => 500,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		)
	);
}

function storyweb_fb_admin_picker( $search ) {
	$ids      = storyweb_fb_find_stories( $search );
	$per_page = 20;
	$pages    = max( 1, (int) ceil( count( $ids ) / $per_page ) );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only page number.
	$current = min( $pages, max( 1, isset( $_GET['trang'] ) ? absint( $_GET['trang'] ) : 1 ) );
	$shown   = array_slice( $ids, ( $current - 1 ) * $per_page, $per_page );
	if ( $shown ) {
		_prime_post_caches( $shown );
	}
	$links = paginate_links(
		array(
			'base'      => add_query_arg( 'trang', '%#%', storyweb_fb_admin_url( '' !== $search ? array( 'q' => $search ) : array() ) ),
			'format'    => '',
			'current'   => $current,
			'total'     => $pages,
			'prev_text' => '‹ Trước',
			'next_text' => 'Sau ›',
		)
	);
	?>
	<h2>Chọn truyện</h2>
	<form method="get" action="<?php echo esc_url( admin_url( 'edit.php' ) ); ?>">
		<input type="hidden" name="post_type" value="story"><input type="hidden" name="page" value="storyweb-facebook">
		<input type="search" name="q" value="<?php echo esc_attr( $search ); ?>" class="regular-text" placeholder="Mã (TT2D12) hoặc tên truyện…"> <button class="button">Tìm</button>
	</form>
	<p class="description">Gõ mã thì truyện đúng mã lên đầu, sau đó các mã bắt đầu bằng số đó, nhỏ trước. Hoặc ở <strong>Truyện → Tất cả truyện</strong>, rê chuột lên một truyện và bấm <strong>Đăng Facebook</strong>.</p>
	<p data-picker-count><?php echo esc_html( sprintf( '%s truyện', number_format_i18n( count( $ids ) ) ) ); ?><?php echo $pages > 1 ? esc_html( sprintf( ', trang %d/%d', $current, $pages ) ) : ''; ?></p>
	<table class="widefat striped" style="max-width:900px">
		<tbody>
		<?php foreach ( $shown as $id ) : ?>
			<?php $post = get_post( $id ); ?>
			<tr>
				<td style="width:56px"><?php echo get_the_post_thumbnail( $post, array( 48, 69 ), array( 'style' => 'width:48px;height:auto;border-radius:6px' ) ); ?></td>
				<?php $manual_at = (int) get_post_meta( $post->ID, STORYWEB_FB_META_MANUAL, true ); ?>
				<td><strong><?php echo esc_html( get_the_title( $post ) ); ?></strong><br><span class="description"><?php echo (int) storyweb_story_meta( $post )['chapter_count']; ?> chương</span><?php if ( $manual_at ) : ?> · <span style="color:#008a20;font-weight:600">Đã tự đăng <?php echo esc_html( wp_date( 'H:i d/m/Y', $manual_at ) ); ?></span><?php endif; ?></td>
				<td style="text-align:right"><a class="button" href="<?php echo esc_url( storyweb_fb_admin_url( array( 'story' => $post->ID ) ) ); ?>"><?php echo esc_html( storyweb_fb_connected() ? 'Chọn' : 'Tạo bài' ); ?></a></td>
			</tr>
		<?php endforeach; ?>
		<?php if ( ! $shown ) : ?>
			<tr><td>Không thấy truyện nào.</td></tr>
		<?php endif; ?>
		</tbody>
	</table>
	<?php if ( $links ) : ?>
		<div class="tablenav" style="max-width:900px"><div class="tablenav-pages" style="float:none;margin:10px 0"><span class="pagination-links"><?php echo wp_kses_post( $links ); ?></span></div></div>
	<?php endif; ?>
	<?php
}

/**
 * The post composer. With `$connected` false (no Page, or Facebook holding the app) it only makes the kit to post by
 * hand: no publish button, no schedule.
 */
function storyweb_fb_admin_composer( $story, $s, $connected = true ) {
	$sources = storyweb_fb_sources( $story );
	$cover   = get_the_post_thumbnail_url( $story, 'medium' );
	// Per source: the post text with and without the "read on" line (the first comment carries it), and the values
	// the comment template is filled with.
	$texts = array();
	foreach ( $sources as $key => $source ) {
		$texts[ $key ] = array(
			'with'    => storyweb_fb_message( $story, $source, true ),
			'without' => storyweb_fb_message( $story, $source, false ),
			'vars'    => storyweb_fb_comment_vars( $story, $source ),
		);
	}
	$first      = $sources ? array_key_first( $sources ) : '';
	$comment_on = (bool) $s['comment_on'];
	$free  = (int) storyweb_story_meta( $story )['free_chapters'];
	?>
	<p><a href="<?php echo esc_url( storyweb_fb_admin_url() ); ?>">← Chọn truyện khác</a></p>
	<h2><?php echo esc_html( get_the_title( $story ) ); ?></h2>
	<?php if ( ! $sources ) : ?>
		<p>Truyện chưa có giới thiệu hay chương miễn phí nào để đăng.</p>
		<?php return; ?>
	<?php endif; ?>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="storyweb-fb-compose" style="display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start"<?php echo $connected ? '' : ' onsubmit="return false"'; ?>>
		<input type="hidden" name="action" value="storyweb_fb_publish">
		<input type="hidden" name="story" value="<?php echo (int) $story->ID; ?>">
		<?php wp_nonce_field( 'storyweb_fb_publish' ); ?>
		<div style="flex:0 0 220px">
			<?php if ( $cover ) : ?>
				<img src="<?php echo esc_url( $cover ); ?>" alt="" style="width:220px;height:auto;border-radius:12px;display:block">
				<p><label><input type="checkbox" name="with_cover" value="1" checked> Đăng kèm ảnh bìa</label></p>
			<?php else : ?>
				<p class="description">Truyện chưa có ảnh bìa: bài sẽ đăng kèm link truyện (Facebook tự hiện ảnh xem trước của site).</p>
			<?php endif; ?>
		</div>
		<div style="flex:1 1 520px;max-width:760px">
			<p><strong>Lấy nội dung từ</strong></p>
			<?php foreach ( $sources as $key => $source ) : ?>
				<label style="display:inline-block;margin:0 14px 8px 0"><input type="radio" name="source" value="<?php echo esc_attr( $key ); ?>" <?php checked( $first, $key ); ?>> <?php echo esc_html( $source['label'] ); ?></label>
			<?php endforeach; ?>
			<p class="description">Chỉ có chương miễn phí (truyện này: <?php echo (int) $free; ?> chương đầu). Chương khóa không bao giờ được đăng lên Facebook.</p>
			<p><label for="sw-fb-message"><strong>Nội dung bài đăng</strong> (sửa thoải mái trước khi đăng)</label></p>
			<textarea id="sw-fb-message" name="message" rows="16" class="large-text"><?php echo esc_textarea( $texts[ $first ][ $comment_on ? 'without' : 'with' ] ?? '' ); ?></textarea>
			<p class="description"><span id="sw-fb-count">0</span> / <?php echo (int) STORYWEB_FB_MAX_TEXT; ?> ký tự. Đổi lựa chọn ở trên sẽ thay nội dung trong ô này.</p>
			<?php storyweb_fb_admin_comment_boxes( $s, $texts[ $first ]['vars'] ?? array() ); ?>
			<p><label for="sw-fb-tags">Hashtag mặc định</label><br><input id="sw-fb-tags" name="hashtags_default" value="<?php echo esc_attr( $s['hashtags'] ); ?>" class="regular-text"> <span class="description">dùng cho các bài sau; thể loại của truyện được thêm tự động.</span></p>
			<?php if ( $connected ) : ?>
				<p><label for="sw-fb-when">Hẹn giờ đăng (bỏ trống để đăng ngay)</label><br><input id="sw-fb-when" type="datetime-local" name="when"> <span class="description">giờ Việt Nam, từ 10 phút đến 75 ngày tới (Facebook giữ bài và tự đăng đúng giờ).</span></p>
				<?php submit_button( 'Đăng lên Facebook', 'primary', 'submit', false ); ?>
			<?php endif; ?>
			<button type="button" class="button <?php echo $connected ? '' : 'button-primary'; ?>" data-make-kit>Tạo bài để tự đăng</button>
			<?php if ( $connected ) : ?>
				<p class="description">Tự đăng: không gửi gì lên Facebook, chỉ tạo sẵn nội dung, ảnh và bình luận để bạn chép và đăng tay (đỡ bị Facebook quét như đăng tự động).</p>
			<?php endif; ?>
		</div>
	</form>
	<?php storyweb_fb_admin_kit( $story ); ?>
	<script type="application/json" id="sw-fb-texts"><?php echo wp_json_encode( $texts, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE ); ?></script>
	<script>
	( function () {
		var texts = JSON.parse( document.getElementById( 'sw-fb-texts' ).textContent );
		var box = document.getElementById( 'sw-fb-message' );
		var count = document.getElementById( 'sw-fb-count' );
		var when = document.getElementById( 'sw-fb-when' );
		var on = document.getElementById( 'sw-fb-comment-on' );
		var button = document.querySelector( '.storyweb-fb-compose [type=submit]' );
		var update = function () { count.textContent = Array.from( box.value ).length.toLocaleString( 'vi-VN' ); };
		var current = function () {
			var radio = document.querySelector( '.storyweb-fb-compose [name=source]:checked' );
			return texts[ radio ? radio.value : Object.keys( texts )[ 0 ] ];
		};
		// The read-on link goes into the first comment when there is one.
		var fillMessage = function () { var c = current(); box.value = c ? ( on.checked ? c.without : c.with ) : ''; update(); };
		var fillComments = function () {
			var c = current();
			document.querySelectorAll( '.storyweb-fb-compose [data-comment]' ).forEach( function ( wrap ) {
				var text = wrap.querySelector( '[data-comment-template]' ).value;
				Object.keys( c ? c.vars : {} ).forEach( function ( key ) { text = text.split( '{' + key + '}' ).join( c.vars[ key ] ); } );
				wrap.querySelector( '[data-comment-text]' ).value = text.trim();
			} );
		};
		document.querySelectorAll( '.storyweb-fb-compose [name=source]' ).forEach( function ( radio ) {
			radio.addEventListener( 'change', function () { fillMessage(); fillComments(); } );
		} );
		document.querySelectorAll( '.storyweb-fb-compose [data-comment]' ).forEach( function ( wrap ) {
			var tick = wrap.querySelector( '[data-comment-on]' );
			tick.addEventListener( 'change', function () { wrap.querySelector( '[data-comment-text]' ).disabled = ! tick.checked; if ( tick === on ) { fillMessage(); } } );
			wrap.querySelector( '[data-comment-template]' ).addEventListener( 'input', fillComments );
		} );
		box.addEventListener( 'input', update );
		if ( when && button ) {
			when.addEventListener( 'input', function () { button.value = when.value ? 'Hẹn giờ đăng' : 'Đăng lên Facebook'; } );
		}
		update();
	} )();
	</script>
	<?php
}

/**
 * The kit to post by hand, under the composer: the cover as a JPEG (download or copy), the post text and the
 * comments as they are in the composer, each with a copy button, and "Đánh dấu đã đăng tay". Hidden until
 * "Tạo bài để tự đăng"; filled from the composer in the browser, so it is exactly what would have been posted.
 */
function storyweb_fb_admin_kit( $story ) {
	$jpeg = storyweb_fb_cover_url( $story );
	$code = (string) get_post_meta( $story->ID, defined( 'STORYWEB_META_CODE' ) ? STORYWEB_META_CODE : '_sw_code', true );
	$file = sanitize_file_name( strtolower( '' !== $code ? $code : 'truyen-' . $story->ID ) ) . '.jpg';
	$box  = 'margin:0 0 16px;padding:12px 14px;background:#f6f7f7;border:1px solid #dcdcde;border-radius:8px';
	?>
	<div class="storyweb-fb-kit" data-manual-kit hidden style="max-width:1010px;margin:24px 0;padding:18px 20px;background:#fff;border:1px solid #c3c4c7;border-radius:10px">
		<h2 style="margin-top:0">Bài để tự đăng</h2>
		<p class="description">Trên Facebook: mở Page → <strong>Tạo bài viết</strong>, dán nội dung, thêm ảnh, đăng. Rồi dán lần lượt từng bình luận dưới bài. Không có gì được gửi lên Facebook từ đây. Muốn đổi nội dung thì sửa ở khung trên rồi bấm <strong>Tạo lại bài</strong>.</p>
		<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
			<div style="flex:0 0 220px">
				<?php if ( $jpeg ) : ?>
					<img src="<?php echo esc_url( $jpeg ); ?>" alt="<?php echo esc_attr( 'Ảnh bìa ' . get_the_title( $story ) ); ?>" style="width:220px;height:auto;border-radius:12px;display:block">
					<p><a class="button" href="<?php echo esc_url( $jpeg ); ?>" download="<?php echo esc_attr( $file ); ?>" data-kit-download>Tải ảnh (JPG)</a> <button type="button" class="button" data-copy-image="<?php echo esc_url( $jpeg ); ?>">Sao chép ảnh</button></p>
				<?php else : ?>
					<p class="description">Truyện chưa có ảnh bìa: đăng kèm link truyện, Facebook tự hiện ảnh xem trước của site.</p>
				<?php endif; ?>
			</div>
			<div style="flex:1 1 520px;max-width:760px">
				<div style="<?php echo esc_attr( $box ); ?>">
					<p style="margin-top:0"><label for="sw-kit-message"><strong>Nội dung bài</strong></label> <button type="button" class="button button-small" data-copy="message">Sao chép nội dung</button></p>
					<textarea id="sw-kit-message" rows="12" class="large-text" readonly data-kit="message"></textarea>
				</div>
				<div style="<?php echo esc_attr( $box ); ?>" data-kit-wrap="comment">
					<p style="margin-top:0"><label for="sw-kit-comment"><strong>Bình luận 1</strong></label> <button type="button" class="button button-small" data-copy="comment">Sao chép bình luận 1</button></p>
					<textarea id="sw-kit-comment" rows="3" class="large-text" readonly data-kit="comment"></textarea>
				</div>
				<div style="<?php echo esc_attr( $box ); ?>" data-kit-wrap="comment2">
					<p style="margin-top:0"><label for="sw-kit-comment2"><strong>Bình luận 2</strong></label> <button type="button" class="button button-small" data-copy="comment2">Sao chép bình luận 2</button></p>
					<textarea id="sw-kit-comment2" rows="3" class="large-text" readonly data-kit="comment2"></textarea>
				</div>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="storyweb_fb_manual">
					<?php wp_nonce_field( 'storyweb_fb_manual' ); ?>
					<input type="hidden" name="story" value="<?php echo (int) $story->ID; ?>">
					<input type="hidden" name="source" value="" data-kit-source>
					<button type="submit" class="button button-primary">Đánh dấu đã đăng tay</button>
					<span class="description">Ghi vào lịch sử và đánh dấu truyện trong danh sách, để khỏi đăng trùng.</span>
				</form>
				<p class="screen-reader-text" aria-live="polite" data-kit-status></p>
			</div>
		</div>
	</div>
	<script>
	( function () {
		var kit = document.querySelector( '[data-manual-kit]' );
		var make = document.querySelector( '[data-make-kit]' );
		if ( ! kit || ! make ) {
			return;
		}
		var status = kit.querySelector( '[data-kit-status]' );
		var flash = function ( button, text ) {
			var old = button.dataset.label || button.textContent;
			button.dataset.label = old;
			button.textContent = text;
			status.textContent = text;
			clearTimeout( button._t );
			button._t = setTimeout( function () { button.textContent = old; }, 1800 );
		};
		var fill = function () {
			kit.querySelector( '[data-kit="message"]' ).value = document.getElementById( 'sw-fb-message' ).value.trim();
			[ [ '', 'comment' ], [ '2', 'comment2' ] ].forEach( function ( pair ) {
				var tick = document.getElementById( 'sw-fb-comment' + pair[ 0 ] + '-on' );
				var text = document.getElementById( 'sw-fb-comment' + pair[ 0 ] );
				var wrap = kit.querySelector( '[data-kit-wrap="' + pair[ 1 ] + '"]' );
				var value = tick && tick.checked && text ? text.value.trim() : '';
				wrap.hidden = '' === value;
				wrap.querySelector( 'textarea' ).value = value;
			} );
			var radio = document.querySelector( '.storyweb-fb-compose [name=source]:checked' );
			kit.querySelector( '[data-kit-source]' ).value = radio ? radio.value : '';
		};
		make.addEventListener( 'click', function () {
			fill();
			kit.hidden = false;
			make.textContent = 'Tạo lại bài';
			kit.scrollIntoView( { behavior: 'smooth', block: 'start' } );
		} );
		// Text: the Clipboard API where the page is secure (https, localhost), else the old select-and-copy.
		kit.querySelectorAll( '[data-copy]' ).forEach( function ( button ) {
			button.addEventListener( 'click', function () {
				var area = kit.querySelector( '[data-kit="' + button.dataset.copy + '"]' );
				var fallback = function () { area.focus(); area.select(); var ok = document.execCommand( 'copy' ); flash( button, ok ? 'Đã chép ✓' : 'Hãy bôi đen rồi chép' ); };
				if ( navigator.clipboard && window.isSecureContext ) {
					navigator.clipboard.writeText( area.value ).then( function () { flash( button, 'Đã chép ✓' ); }, fallback );
				} else {
					fallback();
				}
			} );
		} );
		// Image: the JPEG redrawn as PNG (what browsers can put on the clipboard). Phones: use the download button.
		var copyImage = kit.querySelector( '[data-copy-image]' );
		if ( copyImage ) {
			copyImage.addEventListener( 'click', function () {
				if ( ! ( navigator.clipboard && window.ClipboardItem && window.isSecureContext ) ) {
					flash( copyImage, 'Không chép được, hãy tải ảnh' );
					return;
				}
				var png = new Promise( function ( resolve, reject ) {
					var picture = new Image();
					picture.onload = function () {
						var canvas = document.createElement( 'canvas' );
						canvas.width = picture.naturalWidth;
						canvas.height = picture.naturalHeight;
						canvas.getContext( '2d' ).drawImage( picture, 0, 0 );
						canvas.toBlob( function ( blob ) { return blob ? resolve( blob ) : reject( new Error( 'png' ) ); }, 'image/png' );
					};
					picture.onerror = reject;
					picture.src = copyImage.dataset.copyImage;
				} );
				navigator.clipboard.write( [ new ClipboardItem( { 'image/png': png } ) ] ).then(
					function () { flash( copyImage, 'Đã chép ảnh ✓' ); },
					function () { flash( copyImage, 'Không chép được, hãy tải ảnh' ); }
				);
			} );
		}
	} )();
	</script>
	<?php
}

function storyweb_fb_admin_history() {
	$log = get_option( STORYWEB_FB_LOG, array() );
	if ( ! is_array( $log ) || ! $log ) {
		return;
	}
	?>
	<h2 style="margin-top:32px">Đã đăng gần đây</h2>
	<table class="widefat striped" style="max-width:900px">
		<thead><tr><th>Lúc</th><th>Truyện</th><th>Nội dung</th><th>Bình luận</th><th>Bài trên Facebook</th></tr></thead>
		<tbody>
		<?php foreach ( $log as $row ) : ?>
			<tr>
				<td><?php echo esc_html( wp_date( 'H:i d/m/Y', (int) $row['time'] ) ); ?><?php echo $row['scheduled'] ? '<br><span class="description">hẹn ' . esc_html( wp_date( 'H:i d/m/Y', (int) $row['scheduled'] ) ) . '</span>' : ''; ?></td>
				<td><?php echo esc_html( get_the_title( (int) $row['story'] ) ); ?></td>
				<td><?php echo esc_html( $row['source'] ); ?></td>
				<td><?php echo esc_html( $row['comment'] ?? '' ); ?></td>
				<td>
					<?php if ( $row['post_id'] ) : ?>
						<?php if ( 'Đã hủy lịch' !== ( $row['comment'] ?? '' ) ) : ?>
							<a href="<?php echo esc_url( storyweb_fb_admin_url( array( 'sua' => $row['post_id'] ) ) ); ?>">Sửa</a> ·
						<?php endif; ?>
						<a href="<?php echo esc_url( 'https://www.facebook.com/' . rawurlencode( $row['post_id'] ) ); ?>" target="_blank" rel="noopener">Mở</a>
					<?php endif; ?>
				</td>
			</tr>
		<?php endforeach; ?>
		</tbody>
	</table>
	<?php
}

/**
 * The two comment boxes (on/off, the text for this post, the template behind it). Without `$vars` (automatic
 * posting) only the switches and templates show: each post's comments are filled in when it is posted.
 *
 * @param array<string,mixed>       $s      storyweb_fb_settings().
 * @param array<string,string>|null $vars   Placeholder values of the story being composed, or null.
 * @param string                    $prefix Element id prefix.
 */
function storyweb_fb_admin_comment_boxes( $s, $vars = null, $prefix = 'sw-fb' ) {
	$boxes = array(
		array( '', 'Bình luận ngay sau khi đăng', 'Page tự bình luận dưới bài vừa đăng. Khi bật, dòng link đọc tiếp chuyển từ bài xuống bình luận này (Facebook thường hạn chế bài có link ra ngoài). Bài hẹn giờ thì bình luận vài phút sau khi bài lên.' ),
		array( '2', 'Thêm bình luận thứ hai', 'Gửi ngay sau bình luận đầu tiên, ví dụ mã truyện, lời mời theo dõi Page.' ),
	);
	foreach ( $boxes as list( $n, $label, $help ) ) {
		$on       = (bool) $s[ 'comment' . $n . '_on' ];
		$template = (string) $s[ 'comment' . $n . '_template' ];
		$id       = $prefix . '-comment' . $n;
		?>
		<div data-comment style="margin:18px 0;padding:14px 16px;background:#fff;border:1px solid #dcdcde;border-radius:8px">
			<label><input type="checkbox" name="comment<?php echo esc_attr( $n ); ?>_on" value="1" id="<?php echo esc_attr( $id ); ?>-on" data-comment-on <?php checked( $on ); ?>> <strong><?php echo esc_html( $label ); ?></strong></label>
			<p class="description"><?php echo esc_html( $help ); ?></p>
			<?php if ( null !== $vars ) : ?>
				<textarea id="<?php echo esc_attr( $id ); ?>" name="comment<?php echo esc_attr( $n ); ?>" rows="3" class="large-text" data-comment-text <?php disabled( ! $on ); ?>><?php echo esc_textarea( storyweb_fb_render_comment( $template, $vars ) ); ?></textarea>
			<?php endif; ?>
			<details <?php echo null === $vars ? 'open' : ''; ?>>
				<summary>Sửa mẫu bình luận</summary>
				<textarea id="<?php echo esc_attr( $id ); ?>-template" name="comment<?php echo esc_attr( $n ); ?>_template" rows="3" class="large-text code" data-comment-template><?php echo esc_textarea( $template ); ?></textarea>
				<p class="description">Mẫu dùng cho các bài sau. Chỗ trống tự điền: <code>{ma_truyen}</code> mã truyện, <code>{ten_truyen}</code> tên truyện, <code>{the_loai}</code> thể loại, <code>{doc_tiep}</code> chữ "Đọc tiếp chương 2" (hoặc "Đọc truyện"), <code>{link_doc_tiep}</code> link đọc tiếp, <code>{link_truyen}</code> link trang truyện, <code>{link_trang_chu}</code> link trang chủ.</p>
			</details>
		</div>
		<?php
	}
}

// ---------- Tự động đăng theo mã (logic in inc/facebook-queue.php) ----------

add_action( 'admin_post_storyweb_fb_queue_start', 'storyweb_fb_admin_queue_start' );
add_action( 'admin_post_storyweb_fb_queue_control', 'storyweb_fb_admin_queue_control' );

function storyweb_fb_admin_queue_start() {
	storyweb_fb_admin_guard( 'storyweb_fb_queue_start' );
	// phpcs:disable WordPress.Security.NonceVerification.Missing -- checked in storyweb_fb_admin_guard().
	$current = storyweb_fb_queue();
	if ( ! storyweb_fb_connected() ) {
		storyweb_fb_notice( 'error', 'Chưa kết nối Page Facebook.' );
		storyweb_fb_back();
	}
	if ( $current && in_array( $current['status'], array( 'running', 'paused' ), true ) ) {
		storyweb_fb_notice( 'error', 'Đang có một lượt tự động đăng. Hủy lượt đó trước khi tạo lượt mới.' );
		storyweb_fb_back();
	}
	$from = storyweb_fb_code_number( storyweb_fb_field( 'from' ) );
	$to   = storyweb_fb_code_number( storyweb_fb_field( 'to' ) );
	if ( ! $from || ! $to || $from > $to ) {
		storyweb_fb_notice( 'error', 'Nhập mã bắt đầu và mã kết thúc, ví dụ TT2D1 và TT2D50 (mã đầu không lớn hơn mã cuối).' );
		storyweb_fb_back();
	}
	$items = storyweb_fb_stories_in_range( $from, $to );
	$skip  = ! empty( $_POST['skip_posted'] );
	if ( $skip ) {
		$items = array_values( array_filter( $items, static fn( $id ) => ! storyweb_fb_was_posted( $id ) ) );
	}
	if ( ! $items ) {
		storyweb_fb_notice( 'error', $skip ? 'Mọi truyện trong khoảng mã này đều đã được đăng.' : 'Không có truyện nào trong khoảng mã này.' );
		storyweb_fb_back();
	}
	if ( count( $items ) > STORYWEB_FB_QUEUE_MAX ) {
		storyweb_fb_notice( 'error', sprintf( 'Mỗi lượt đăng tối đa %d truyện.', STORYWEB_FB_QUEUE_MAX ) );
		storyweb_fb_back();
	}
	$interval = max( 1, absint( $_POST['every'] ?? 60 ) ) * ( 'hour' === storyweb_fb_field( 'unit' ) ? HOUR_IN_SECONDS : MINUTE_IN_SECONDS );
	if ( $interval < 5 * MINUTE_IN_SECONDS ) {
		storyweb_fb_notice( 'error', 'Khoảng cách giữa hai bài ít nhất 5 phút.' );
		storyweb_fb_back();
	}
	// Facebook takes scheduled posts from 10 minutes ahead: the first post is at least 15 minutes after confirming.
	$start = time() + STORYWEB_FB_QUEUE_LEAD;
	$when  = storyweb_fb_field( 'start' );
	if ( '' !== $when ) {
		try {
			$start = ( new DateTimeImmutable( $when, wp_timezone() ) )->getTimestamp();
		} catch ( Exception $e ) {
			$start = 0;
		}
		if ( $start < time() - MINUTE_IN_SECONDS || $start > time() + STORYWEB_FB_SCHEDULE_AHEAD ) {
			storyweb_fb_notice( 'error', 'Giờ bắt đầu phải từ bây giờ đến 75 ngày tới (bỏ trống để bắt đầu sau 15 phút).' );
			storyweb_fb_back();
		}
		$start = max( $start, time() + STORYWEB_FB_QUEUE_LEAD );
	}
	$source = storyweb_fb_field( 'auto_source' );
	storyweb_fb_remember_post_settings( storyweb_fb_field( 'hashtags_default' ) );
	$s     = storyweb_fb_settings();
	$queue = array(
		'mode'              => 'facebook',
		'items'             => $items,
		'pos'               => 0,
		'done'              => 0,
		'skipped'           => 0,
		'status'            => 'running',
		'waiting'           => false,
		'error'             => '',
		'from'              => $from,
		'to'                => $to,
		'interval'          => $interval,
		'start'             => $start,
		'next'              => time(),
		'posts'             => array(),
		'last'              => 0,
		'created'           => time(),
		'source'            => in_array( $source, array( 'about', 'start', 'chapter' ), true ) ? $source : 'about',
		'chapter'           => max( 1, absint( $_POST['auto_chapter'] ?? 1 ) ),
		'with_cover'        => ! empty( $_POST['with_cover'] ),
		'comment_on'        => (bool) $s['comment_on'],
		'comment_template'  => $s['comment_template'],
		'comment2_on'       => (bool) $s['comment2_on'],
		'comment2_template' => $s['comment2_template'],
	);
	// phpcs:enable
	storyweb_fb_queue_save( $queue );
	// First batch now; the page sends the rest (admin-ajax), WP-Cron finishes if it is closed.
	storyweb_fb_queue_step( 5 );
	storyweb_fb_notice(
		'success',
		sprintf(
			'Đang lên lịch %d truyện (%s → %s) trên Facebook. Bài đầu lúc %s, mỗi bài cách %s.',
			count( $items ),
			storyweb_code_format( $from ),
			storyweb_code_format( $to ),
			wp_date( 'H:i d/m/Y', $start ),
			storyweb_fb_duration( $interval )
		)
	);
	storyweb_fb_back();
}

/** "45 phút", "2 giờ", "1 giờ 30 phút". */
function storyweb_fb_duration( $seconds ) {
	$hours   = intdiv( (int) $seconds, HOUR_IN_SECONDS );
	$minutes = intdiv( (int) $seconds % HOUR_IN_SECONDS, MINUTE_IN_SECONDS );
	return trim( ( $hours ? $hours . ' giờ ' : '' ) . ( $minutes ? $minutes . ' phút' : '' ) );
}

function storyweb_fb_admin_queue_control() {
	storyweb_fb_admin_guard( 'storyweb_fb_queue_control' );
	$queue = storyweb_fb_queue();
	$do    = storyweb_fb_field( 'do' );
	if ( 'cancel' === $do ) {
		$counts = storyweb_fb_queue_cancel();
		$text   = 'Đã hủy lượt tự động đăng.';
		$text  .= $counts['deleted'] ? sprintf( ' Đã xóa %d bài chưa đăng khỏi lịch Facebook.', $counts['deleted'] ) : '';
		$text  .= $counts['failed'] ? sprintf( ' %d bài chưa xóa được: vào Meta Business Suite → Nội dung → Đã lên lịch để xóa.', $counts['failed'] ) : '';
		storyweb_fb_notice( $counts['failed'] ? 'warning' : 'success', $text . ' Các bài đã lên vẫn giữ trên Page.' );
	} elseif ( $queue && 'to_facebook' === $do ) {
		storyweb_fb_queue_to_facebook();
		storyweb_fb_notice( 'success', 'Đã chuyển sang lịch Facebook: các bài còn lại được gửi lên Facebook kèm giờ đăng.' );
	} elseif ( $queue && 'pause' === $do && 'running' === $queue['status'] && 'cron' === storyweb_fb_queue_mode( $queue ) ) {
		$queue['status'] = 'paused';
		storyweb_fb_queue_save( $queue );
		storyweb_fb_queue_schedule( $queue );
		storyweb_fb_notice( 'success', 'Đã tạm dừng tự động đăng.' );
	} elseif ( $queue && 'resume' === $do && 'paused' === $queue['status'] ) {
		$queue['status'] = 'running';
		$queue['error']  = '';
		if ( 'facebook' === storyweb_fb_queue_mode( $queue ) ) {
			storyweb_fb_queue_save( $queue );
			storyweb_fb_queue_step( 5 );
		} else {
			$queue['next'] = max( time(), (int) $queue['next'] );
			storyweb_fb_queue_save( $queue );
			storyweb_fb_queue_schedule( $queue );
		}
		storyweb_fb_notice( 'success', 'Đã tiếp tục tự động đăng.' );
	}
	storyweb_fb_back();
}

// The admin page sends a Facebook-scheduled run to Facebook in small batches while it is open.
add_action(
	'wp_ajax_storyweb_fb_queue_step',
	static function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( null, 403 );
		}
		check_ajax_referer( 'storyweb_fb_queue_step' );
		$queue = storyweb_fb_queue_step( 5 );
		wp_send_json(
			array(
				'status'  => (string) ( $queue['status'] ?? '' ),
				'done'    => (int) ( $queue['done'] ?? 0 ),
				'total'   => count( (array) ( $queue['items'] ?? array() ) ),
				'waiting' => ! empty( $queue['waiting'] ),
				'error'   => (string) ( $queue['error'] ?? '' ),
			)
		);
	}
);

/** Status of the current run with its buttons, and the form to start one when none is in progress. */
function storyweb_fb_admin_queue( $s ) {
	$queue = storyweb_fb_queue();
	$last  = function_exists( 'storyweb_code_next_number' ) ? storyweb_code_next_number() - 1 : 0;
	$range = $queue ? storyweb_code_format( $queue['from'] ) . ' → ' . storyweb_code_format( $queue['to'] ) : '';
	$total = $queue ? count( $queue['items'] ) : 0;
	?>
	<h2>Tự động đăng theo mã truyện</h2>
	<?php if ( $queue && in_array( $queue['status'], array( 'running', 'paused' ), true ) && 'facebook' === storyweb_fb_queue_mode( $queue ) ) : ?>
		<div class="notice inline notice-<?php echo 'running' === $queue['status'] ? 'info' : 'warning'; ?>" style="padding:12px 16px;max-width:860px" data-queue="<?php echo esc_attr( $queue['status'] ); ?>">
			<p><strong><?php echo 'running' === $queue['status'] ? 'Đang lên lịch trên Facebook' : 'Đã tạm dừng'; ?></strong> <?php echo esc_html( $range ); ?>: đã lên lịch <strong data-queue-done><?php echo (int) $queue['done']; ?></strong>/<?php echo (int) $total; ?> bài<?php echo $queue['skipped'] ? esc_html( sprintf( ', bỏ qua %d (không có nội dung để đăng)', $queue['skipped'] ) ) : ''; ?>, mỗi bài cách <?php echo esc_html( storyweb_fb_duration( $queue['interval'] ) ); ?>, bài đầu lúc <?php echo esc_html( wp_date( 'H:i d/m/Y', (int) $queue['start'] ) ); ?>.</p>
			<?php if ( ! empty( $queue['waiting'] ) ) : ?>
				<p>Facebook chỉ nhận lịch trong 75 ngày tới: các bài còn lại tự được gửi lên lịch từ <?php echo esc_html( wp_date( 'd/m/Y', (int) $queue['next'] ) ); ?>.</p>
			<?php elseif ( 'running' === $queue['status'] ) : ?>
				<p data-queue-step data-nonce="<?php echo esc_attr( wp_create_nonce( 'storyweb_fb_queue_step' ) ); ?>">Đang gửi lịch lên Facebook… Cứ để trang này mở; đóng trang thì site tự gửi nốt trong vài phút.</p>
			<?php endif; ?>
			<?php if ( ! empty( $queue['error'] ) ) : ?>
				<p style="color:#b32d2e">Tạm dừng vì lỗi: <?php echo esc_html( $queue['error'] ); ?></p>
			<?php endif; ?>
			<?php storyweb_fb_admin_queue_buttons( $queue ); ?>
			<p class="description">Facebook giữ lịch và tự đăng đúng giờ (xem trong Meta Business Suite → Nội dung → Đã lên lịch). Bình luận thì Facebook không cho hẹn giờ: site gửi vài phút sau khi mỗi bài lên.</p>
		</div>
		<?php storyweb_fb_admin_queue_script(); ?>
		<?php return; ?>
	<?php endif; ?>
	<?php if ( $queue && in_array( $queue['status'], array( 'running', 'paused' ), true ) ) : ?>
		<?php $next = get_post( (int) ( $queue['items'][ $queue['pos'] ] ?? 0 ) ); ?>
		<div class="notice inline notice-<?php echo 'running' === $queue['status'] ? 'info' : 'warning'; ?>" style="padding:12px 16px;max-width:860px" data-queue="<?php echo esc_attr( $queue['status'] ); ?>">
			<p><strong><?php echo 'running' === $queue['status'] ? 'Đang tự động đăng' : 'Đã tạm dừng'; ?></strong> <?php echo esc_html( $range ); ?>: đã đăng <strong><?php echo (int) $queue['done']; ?>/<?php echo (int) $total; ?></strong> truyện<?php echo $queue['skipped'] ? esc_html( sprintf( ', bỏ qua %d (không có nội dung để đăng)', $queue['skipped'] ) ) : ''; ?>, mỗi bài cách <?php echo esc_html( storyweb_fb_duration( $queue['interval'] ) ); ?>.</p>
			<?php if ( $next ) : ?>
				<p>Bài tiếp theo: <strong><?php echo esc_html( get_the_title( $next ) ); ?></strong><?php echo 'running' === $queue['status'] ? esc_html( ' lúc ' . wp_date( 'H:i d/m/Y', max( time(), (int) $queue['next'] ) ) ) : ''; ?>.</p>
			<?php endif; ?>
			<?php if ( ! empty( $queue['error'] ) ) : ?>
				<p style="color:#b32d2e">Tạm dừng vì lỗi: <?php echo esc_html( $queue['error'] ); ?></p>
			<?php endif; ?>
			<p>Lượt này đang được site tự đăng khi tới giờ (cần có người vào site). Chuyển sang <strong>lịch Facebook</strong> để Facebook giữ các bài còn lại và đăng đúng giờ.</p>
			<?php storyweb_fb_admin_queue_buttons( $queue ); ?>
		</div>
		<?php return; ?>
	<?php endif; ?>
	<?php if ( $queue && 'scheduled' === $queue['status'] ) : ?>
		<?php
		$end  = storyweb_fb_queue_last_time( $queue );
		$live = count( array_filter( (array) $queue['posts'], static fn( $post ) => (int) $post['at'] <= time() ) );
		?>
		<div class="notice inline notice-success" style="padding:12px 16px;max-width:860px" data-queue="scheduled">
			<p><strong>Đã lên lịch hết trên Facebook</strong> <?php echo esc_html( $range ); ?>: <?php echo (int) $queue['done']; ?> bài<?php echo $queue['skipped'] ? esc_html( sprintf( ' (bỏ qua %d)', $queue['skipped'] ) ) : ''; ?>, bài cuối lúc <?php echo esc_html( wp_date( 'H:i d/m/Y', $end ) ); ?>. Đã lên Page: <?php echo (int) $live; ?>/<?php echo (int) $queue['done']; ?>.</p>
			<?php if ( $end > time() ) : ?>
				<?php storyweb_fb_admin_queue_buttons( $queue ); ?>
			<?php endif; ?>
		</div>
	<?php endif; ?>
	<?php if ( $queue && 'done' === $queue['status'] ) : ?>
		<p>Lượt trước (<?php echo esc_html( $range ); ?>) đã xong: đăng <?php echo (int) $queue['done']; ?>/<?php echo (int) $total; ?> truyện.</p>
	<?php endif; ?>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="storyweb-fb-auto" style="max-width:860px">
		<input type="hidden" name="action" value="storyweb_fb_queue_start">
		<?php wp_nonce_field( 'storyweb_fb_queue_start' ); ?>
		<table class="form-table" role="presentation">
			<tr><th scope="row">Mã truyện</th><td>từ <input name="from" class="regular-text code" style="width:9em" placeholder="TT2D1" required> đến <input name="to" class="regular-text code" style="width:9em" placeholder="TT2D50" required><?php if ( $last > 0 ) : ?><p class="description">Site đang có mã từ <?php echo esc_html( storyweb_code_format( 1 ) ); ?> đến <?php echo esc_html( storyweb_code_format( $last ) ); ?>. Đăng lần lượt theo mã tăng dần.</p><?php endif; ?></td></tr>
			<tr><th scope="row">Bắt đầu</th><td><input type="datetime-local" name="start"> <span class="description">bỏ trống thì bài đầu sau 15 phút (Facebook nhận lịch từ 10 phút tới 75 ngày tới).</span></td></tr>
			<tr><th scope="row">Mỗi bài cách</th><td><input type="number" name="every" min="1" value="60" class="small-text"> <select name="unit"><option value="minute">phút</option><option value="hour">giờ</option></select> <span class="description">ít nhất 5 phút. Đăng quá dày dễ bị Facebook coi là spam.</span></td></tr>
			<tr><th scope="row">Nội dung</th><td>
				<label><input type="radio" name="auto_source" value="about" checked> Giới thiệu truyện</label><br>
				<label><input type="radio" name="auto_source" value="start"> Đoạn mở đầu chương 1</label><br>
				<label><input type="radio" name="auto_source" value="chapter"> Cả chương <input type="number" name="auto_chapter" min="1" value="1" class="small-text"></label>
				<p class="description">Truyện nào không có phần đã chọn thì lấy phần gần nhất (chương → đoạn mở đầu → giới thiệu). Chỉ chương miễn phí.</p>
			</td></tr>
			<tr><th scope="row">Ảnh</th><td><label><input type="checkbox" name="with_cover" value="1" checked> Đăng kèm ảnh bìa</label></td></tr>
			<tr><th scope="row">Bỏ qua</th><td><label><input type="checkbox" name="skip_posted" value="1" checked> Truyện đã từng đăng lên Page</label></td></tr>
			<tr><th scope="row"><label for="sw-fb-auto-tags">Hashtag</label></th><td><input id="sw-fb-auto-tags" name="hashtags_default" value="<?php echo esc_attr( $s['hashtags'] ); ?>" class="regular-text"> <span class="description">thể loại của từng truyện được thêm tự động.</span></td></tr>
		</table>
		<?php storyweb_fb_admin_comment_boxes( $s, null, 'sw-fb-auto' ); ?>
		<?php submit_button( 'Lên lịch trên Facebook' ); ?>
	</form>
	<?php
}

/** The run's buttons: resume (paused), pause (WP-Cron run), switch to Facebook scheduling (WP-Cron run), cancel. */
function storyweb_fb_admin_queue_buttons( $queue ) {
	$facebook = 'facebook' === storyweb_fb_queue_mode( $queue );
	?>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:flex;gap:8px;flex-wrap:wrap">
		<input type="hidden" name="action" value="storyweb_fb_queue_control">
		<?php wp_nonce_field( 'storyweb_fb_queue_control' ); ?>
		<?php if ( 'paused' === $queue['status'] ) : ?>
			<button class="button button-primary" name="do" value="resume">Tiếp tục</button>
		<?php endif; ?>
		<?php if ( ! $facebook && in_array( $queue['status'], array( 'running', 'paused' ), true ) ) : ?>
			<button class="button button-primary" name="do" value="to_facebook">Chuyển sang lịch Facebook</button>
			<?php if ( 'running' === $queue['status'] ) : ?>
				<button class="button" name="do" value="pause">Tạm dừng</button>
			<?php endif; ?>
		<?php endif; ?>
		<button class="button button-link-delete" name="do" value="cancel" onclick="return confirm('<?php echo esc_js( $facebook ? 'Hủy lượt này và xóa các bài chưa đăng khỏi lịch Facebook?' : 'Hủy lượt tự động đăng?' ); ?>')"><?php echo $facebook ? 'Hủy và xóa các bài chưa đăng' : 'Hủy'; ?></button>
	</form>
	<?php
}

/** While a Facebook-scheduled run is being sent, the page sends the next batch, then the next, and reloads at the end. */
function storyweb_fb_admin_queue_script() {
	?>
	<script>
	( function () {
		var box = document.querySelector( '[data-queue-step]' );
		if ( ! box || ! window.fetch ) { return; }
		var done = document.querySelector( '[data-queue-done]' );
		var step = function () {
			var body = new URLSearchParams( { action: 'storyweb_fb_queue_step', _ajax_nonce: box.dataset.nonce } );
			fetch( window.ajaxurl, { method: 'POST', credentials: 'same-origin', body: body } )
				.then( function ( response ) { return response.json(); } )
				.then( function ( data ) {
					if ( done ) { done.textContent = data.done; }
					if ( 'running' === data.status && ! data.waiting && ! data.error ) { setTimeout( step, 300 ); } else { window.location.reload(); }
				} )
				.catch( function () { setTimeout( step, 5000 ); } );
		};
		setTimeout( step, 500 );
	} )();
	</script>
	<?php
}
