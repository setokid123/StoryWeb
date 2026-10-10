<?php
/**
 * wp-admin → Truyện → Đăng Facebook (administrators): connect a Page, then pick a story, a source (description,
 * opening of chapter 1, a whole free chapter), edit the text and post it with the cover, now or at a set time, with
 * an optional first comment from a template (the "read on" link then moves from the post to the comment).
 * Also a "Đăng Facebook" link under each story in Truyện → Tất cả truyện. Logic in inc/facebook.php.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

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
		if ( $at < time() + 10 * MINUTE_IN_SECONDS || $at > time() + 30 * DAY_IN_SECONDS ) {
			storyweb_fb_notice( 'error', 'Giờ hẹn phải cách bây giờ từ 10 phút đến 30 ngày.' );
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
	// phpcs:enable
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
		<?php else : ?>
			<p>Đang đăng lên Page <strong><?php echo esc_html( $s['page_name'] ); ?></strong> <code><?php echo esc_html( $s['page_id'] ); ?></code>, kết nối lúc <?php echo esc_html( wp_date( 'H:i d/m/Y', (int) $s['connected_at'] ) ); ?>.</p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-bottom:16px">
				<input type="hidden" name="action" value="storyweb_fb_disconnect">
				<?php wp_nonce_field( 'storyweb_fb_disconnect' ); ?>
				<button type="submit" class="button button-link-delete" onclick="return confirm('Ngắt kết nối Page?')">Ngắt kết nối</button>
			</form>
			<?php
			$story = $story_id ? get_post( $story_id ) : null;
			if ( $story && 'story' === $story->post_type && 'publish' === $story->post_status ) {
				storyweb_fb_admin_composer( $story, $s );
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

function storyweb_fb_admin_picker( $search ) {
	$query = new WP_Query(
		array(
			'post_type'      => 'story',
			'post_status'    => 'publish',
			'posts_per_page' => 15,
			's'              => $search,
			'orderby'        => '' === $search ? 'modified' : 'relevance',
			'no_found_rows'  => true,
		)
	);
	?>
	<h2>Chọn truyện</h2>
	<form method="get" action="<?php echo esc_url( admin_url( 'edit.php' ) ); ?>">
		<input type="hidden" name="post_type" value="story"><input type="hidden" name="page" value="storyweb-facebook">
		<input type="search" name="q" value="<?php echo esc_attr( $search ); ?>" class="regular-text" placeholder="Tên truyện…"> <button class="button">Tìm</button>
	</form>
	<p class="description">Hoặc ở <strong>Truyện → Tất cả truyện</strong>, rê chuột lên một truyện và bấm <strong>Đăng Facebook</strong>.</p>
	<table class="widefat striped" style="max-width:900px;margin-top:12px">
		<tbody>
		<?php foreach ( $query->posts as $post ) : ?>
			<tr>
				<td style="width:56px"><?php echo get_the_post_thumbnail( $post, array( 48, 69 ), array( 'style' => 'width:48px;height:auto;border-radius:6px' ) ); ?></td>
				<td><strong><?php echo esc_html( get_the_title( $post ) ); ?></strong><br><span class="description"><?php echo (int) storyweb_story_meta( $post )['chapter_count']; ?> chương</span></td>
				<td style="text-align:right"><a class="button" href="<?php echo esc_url( storyweb_fb_admin_url( array( 'story' => $post->ID ) ) ); ?>">Chọn</a></td>
			</tr>
		<?php endforeach; ?>
		<?php if ( ! $query->posts ) : ?>
			<tr><td>Không thấy truyện nào.</td></tr>
		<?php endif; ?>
		</tbody>
	</table>
	<?php
}

function storyweb_fb_admin_composer( $story, $s ) {
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
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="storyweb-fb-compose" style="display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start">
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
			<p><label for="sw-fb-when">Hẹn giờ đăng (bỏ trống để đăng ngay)</label><br><input id="sw-fb-when" type="datetime-local" name="when"> <span class="description">giờ Việt Nam, từ 10 phút đến 30 ngày tới.</span></p>
			<?php submit_button( 'Đăng lên Facebook', 'primary', 'submit', false ); ?>
		</div>
	</form>
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
		when.addEventListener( 'input', function () { button.value = when.value ? 'Hẹn giờ đăng' : 'Đăng lên Facebook'; } );
		update();
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
				<td><?php if ( $row['post_id'] ) : ?><a href="<?php echo esc_url( 'https://www.facebook.com/' . rawurlencode( $row['post_id'] ) ); ?>" target="_blank" rel="noopener">Mở</a><?php endif; ?></td>
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
		storyweb_fb_notice( 'error', 'Nhập mã bắt đầu và mã kết thúc, ví dụ TT2D00001 và TT2D00050 (mã đầu không lớn hơn mã cuối).' );
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
	$start = time();
	$when  = storyweb_fb_field( 'start' );
	if ( '' !== $when ) {
		try {
			$start = ( new DateTimeImmutable( $when, wp_timezone() ) )->getTimestamp();
		} catch ( Exception $e ) {
			$start = 0;
		}
		if ( $start < time() - MINUTE_IN_SECONDS || $start > time() + 60 * DAY_IN_SECONDS ) {
			storyweb_fb_notice( 'error', 'Giờ bắt đầu phải từ bây giờ đến 60 ngày tới (bỏ trống để bắt đầu ngay).' );
			storyweb_fb_back();
		}
	}
	$source = storyweb_fb_field( 'auto_source' );
	storyweb_fb_remember_post_settings( storyweb_fb_field( 'hashtags_default' ) );
	$s     = storyweb_fb_settings();
	$queue = array(
		'items'             => $items,
		'pos'               => 0,
		'done'              => 0,
		'skipped'           => 0,
		'status'            => 'running',
		'error'             => '',
		'from'              => $from,
		'to'                => $to,
		'interval'          => $interval,
		'next'              => $start,
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
	storyweb_fb_queue_schedule( $queue );
	storyweb_fb_notice(
		'success',
		sprintf(
			'Đã lên lịch tự động đăng %d truyện (%s → %s). Bài đầu lúc %s, mỗi bài cách %s.',
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
		delete_option( STORYWEB_FB_QUEUE );
		wp_clear_scheduled_hook( STORYWEB_FB_QUEUE_HOOK );
		storyweb_fb_notice( 'success', 'Đã hủy lượt tự động đăng. Các bài đã đăng vẫn giữ trên Page.' );
	} elseif ( $queue && 'pause' === $do && 'running' === $queue['status'] ) {
		$queue['status'] = 'paused';
		storyweb_fb_queue_save( $queue );
		storyweb_fb_queue_schedule( $queue );
		storyweb_fb_notice( 'success', 'Đã tạm dừng tự động đăng.' );
	} elseif ( $queue && 'resume' === $do && 'paused' === $queue['status'] ) {
		$queue['status'] = 'running';
		$queue['error']  = '';
		$queue['next']   = max( time(), (int) $queue['next'] );
		storyweb_fb_queue_save( $queue );
		storyweb_fb_queue_schedule( $queue );
		storyweb_fb_notice( 'success', 'Đã tiếp tục tự động đăng.' );
	}
	storyweb_fb_back();
}

/** Status of the current run with its buttons, or the form to start one. */
function storyweb_fb_admin_queue( $s ) {
	$queue = storyweb_fb_queue();
	$last  = function_exists( 'storyweb_code_next_number' ) ? storyweb_code_next_number() - 1 : 0;
	?>
	<h2>Tự động đăng theo mã truyện</h2>
	<?php if ( $queue && in_array( $queue['status'], array( 'running', 'paused' ), true ) ) : ?>
		<?php
		$total = count( $queue['items'] );
		$next  = get_post( (int) ( $queue['items'][ $queue['pos'] ] ?? 0 ) );
		?>
		<div class="notice inline notice-<?php echo 'running' === $queue['status'] ? 'info' : 'warning'; ?>" style="padding:12px 16px;max-width:860px" data-queue="<?php echo esc_attr( $queue['status'] ); ?>">
			<p><strong><?php echo 'running' === $queue['status'] ? 'Đang tự động đăng' : 'Đã tạm dừng'; ?></strong> <?php echo esc_html( storyweb_code_format( $queue['from'] ) . ' → ' . storyweb_code_format( $queue['to'] ) ); ?>: đã đăng <strong><?php echo (int) $queue['done']; ?>/<?php echo (int) $total; ?></strong> truyện<?php echo $queue['skipped'] ? esc_html( sprintf( ', bỏ qua %d (không có nội dung để đăng)', $queue['skipped'] ) ) : ''; ?>, mỗi bài cách <?php echo esc_html( storyweb_fb_duration( $queue['interval'] ) ); ?>.</p>
			<?php if ( $next ) : ?>
				<p>Bài tiếp theo: <strong><?php echo esc_html( get_the_title( $next ) ); ?></strong><?php echo 'running' === $queue['status'] ? esc_html( ' lúc ' . wp_date( 'H:i d/m/Y', max( time(), (int) $queue['next'] ) ) ) : ''; ?>.</p>
			<?php endif; ?>
			<?php if ( ! empty( $queue['error'] ) ) : ?>
				<p style="color:#b32d2e">Tạm dừng vì lỗi: <?php echo esc_html( $queue['error'] ); ?></p>
			<?php endif; ?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:flex;gap:8px">
				<input type="hidden" name="action" value="storyweb_fb_queue_control">
				<?php wp_nonce_field( 'storyweb_fb_queue_control' ); ?>
				<?php if ( 'running' === $queue['status'] ) : ?>
					<button class="button" name="do" value="pause">Tạm dừng</button>
				<?php else : ?>
					<button class="button button-primary" name="do" value="resume">Tiếp tục</button>
				<?php endif; ?>
				<button class="button button-link-delete" name="do" value="cancel" onclick="return confirm('Hủy lượt tự động đăng?')">Hủy</button>
			</form>
			<p class="description">Cron của WordPress chạy khi có người vào site, nên bài có thể lên trễ vài phút; sau mỗi bài luôn cách đủ khoảng đã chọn.</p>
		</div>
		<?php return; ?>
	<?php endif; ?>
	<?php if ( $queue && 'done' === $queue['status'] ) : ?>
		<p>Lượt trước (<?php echo esc_html( storyweb_code_format( $queue['from'] ) . ' → ' . storyweb_code_format( $queue['to'] ) ); ?>) đã xong: đăng <?php echo (int) $queue['done']; ?>/<?php echo (int) count( $queue['items'] ); ?> truyện.</p>
	<?php endif; ?>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="storyweb-fb-auto" style="max-width:860px">
		<input type="hidden" name="action" value="storyweb_fb_queue_start">
		<?php wp_nonce_field( 'storyweb_fb_queue_start' ); ?>
		<table class="form-table" role="presentation">
			<tr><th scope="row">Mã truyện</th><td>từ <input name="from" class="regular-text code" style="width:9em" placeholder="TT2D00001" required> đến <input name="to" class="regular-text code" style="width:9em" placeholder="TT2D00050" required><?php if ( $last > 0 ) : ?><p class="description">Site đang có mã từ <?php echo esc_html( storyweb_code_format( 1 ) ); ?> đến <?php echo esc_html( storyweb_code_format( $last ) ); ?>. Đăng lần lượt theo mã tăng dần.</p><?php endif; ?></td></tr>
			<tr><th scope="row">Bắt đầu</th><td><input type="datetime-local" name="start"> <span class="description">bỏ trống để đăng bài đầu ngay.</span></td></tr>
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
		<?php submit_button( 'Bắt đầu tự động đăng' ); ?>
	</form>
	<?php
}
