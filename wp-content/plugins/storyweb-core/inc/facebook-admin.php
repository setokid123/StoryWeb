<?php
/**
 * wp-admin → Truyện → Đăng Facebook (administrators): connect a Page, then pick a story, a source (description,
 * opening of chapter 1, a whole free chapter), edit the text and post it with the cover, now or at a set time.
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
	if ( '' !== $tags ) {
		$s             = storyweb_fb_settings();
		$s['hashtags'] = $tags;
		storyweb_fb_save_settings( $s );
	}
	$result = storyweb_fb_publish( $story, $message, $cover, $at );
	if ( is_wp_error( $result ) ) {
		storyweb_fb_notice( 'error', $result->get_error_message() );
		storyweb_fb_back( array( 'story' => $story->ID ) );
	}
	storyweb_fb_log( $story, $sources[ $source ]['label'], $result['post_id'], $at );
	storyweb_fb_notice(
		'success',
		$at ? sprintf( 'Đã hẹn đăng "%s" lúc %s.', get_the_title( $story ), wp_date( 'H:i d/m/Y', $at ) ) : sprintf( 'Đã đăng "%s" lên Page.', get_the_title( $story ) ),
		$result['post_id'] ? 'https://www.facebook.com/' . rawurlencode( $result['post_id'] ) : ''
	);
	storyweb_fb_back( array( 'story' => $story->ID ) );
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
			<div class="notice notice-<?php echo 'success' === $notice['type'] ? 'success' : 'error'; ?> is-dismissible"><p><?php echo esc_html( $notice['text'] ); ?>
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
	$texts   = array();
	foreach ( $sources as $key => $source ) {
		$texts[ $key ] = storyweb_fb_message( $story, $source );
	}
	$first = $sources ? array_key_first( $sources ) : '';
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
			<textarea id="sw-fb-message" name="message" rows="16" class="large-text"><?php echo esc_textarea( $texts[ $first ] ?? '' ); ?></textarea>
			<p class="description"><span id="sw-fb-count">0</span> / <?php echo (int) STORYWEB_FB_MAX_TEXT; ?> ký tự. Đổi lựa chọn ở trên sẽ thay nội dung trong ô này.</p>
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
		var button = document.querySelector( '.storyweb-fb-compose [type=submit]' );
		var update = function () { count.textContent = Array.from( box.value ).length.toLocaleString( 'vi-VN' ); };
		document.querySelectorAll( '.storyweb-fb-compose [name=source]' ).forEach( function ( radio ) {
			radio.addEventListener( 'change', function () { box.value = texts[ radio.value ] || ''; update(); } );
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
		<thead><tr><th>Lúc</th><th>Truyện</th><th>Nội dung</th><th>Bài trên Facebook</th></tr></thead>
		<tbody>
		<?php foreach ( $log as $row ) : ?>
			<tr>
				<td><?php echo esc_html( wp_date( 'H:i d/m/Y', (int) $row['time'] ) ); ?><?php echo $row['scheduled'] ? '<br><span class="description">hẹn ' . esc_html( wp_date( 'H:i d/m/Y', (int) $row['scheduled'] ) ) . '</span>' : ''; ?></td>
				<td><?php echo esc_html( get_the_title( (int) $row['story'] ) ); ?></td>
				<td><?php echo esc_html( $row['source'] ); ?></td>
				<td><?php if ( $row['post_id'] ) : ?><a href="<?php echo esc_url( 'https://www.facebook.com/' . rawurlencode( $row['post_id'] ) ); ?>" target="_blank" rel="noopener">Mở</a><?php endif; ?></td>
			</tr>
		<?php endforeach; ?>
		</tbody>
	</table>
	<?php
}
