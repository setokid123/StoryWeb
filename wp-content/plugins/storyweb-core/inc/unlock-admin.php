<?php
/**
 * wp-admin → Truyện → Mở khóa chương: switch, up to 10 links (one picked at random per page view), duration, and
 * the invitation shown in the popup (title, text before/after with formatting, clickable image, link text, button).
 * Administrators only. Saving changed links or the switch, or "Thu hồi", bumps the revision (inc/unlock.php).
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'admin_menu',
	static function () {
		add_submenu_page( 'edit.php?post_type=story', 'Mở khóa chương', 'Mở khóa chương', 'manage_options', 'storyweb-unlock', 'storyweb_unlock_admin_page' );
	}
);

add_action( 'admin_post_storyweb_unlock_save', 'storyweb_unlock_admin_save' );

/** Post-like HTML for the invitation text; script/style blocks go with their contents (kses alone would keep the code as text). */
function storyweb_unlock_clean_html( $html ) {
	$html = preg_replace( '#<(script|style)\b[^>]*>.*?(</\1\s*>|$)#is', '', (string) $html );
	return trim( wp_kses_post( (string) $html ) );
}

/** The editor's two toolbar rows, the second (text colour…) shown from the start. */
function storyweb_unlock_editor( $content, $id, $name, $rows ) {
	wp_editor(
		$content,
		$id,
		array(
			'textarea_name' => $name,
			'textarea_rows' => $rows,
			'media_buttons' => false,
			'tinymce'       => array( 'wordpress_adv_hidden' => false ),
		)
	);
}

function storyweb_unlock_admin_save() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Bạn không có quyền.', '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'storyweb_unlock_save' );
	$old   = storyweb_unlock_settings();
	$links = array();
	$bad   = 0;
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- each link is validated by storyweb_unlock_clean_url().
	foreach ( (array) wp_unslash( $_POST['links'] ?? array() ) as $raw ) {
		$raw = trim( (string) $raw );
		if ( '' === $raw ) {
			continue;
		}
		$clean = storyweb_unlock_clean_url( $raw );
		if ( $clean ) {
			$links[] = $clean;
		} else {
			++$bad;
		}
	}
	$new = array(
		'enabled'   => ! empty( $_POST['enabled'] ),
		'minutes'   => min( 1440, max( 1, absint( $_POST['minutes'] ?? 60 ) ) ),
		'links'     => array_slice( array_values( array_unique( $links ) ), 0, STORYWEB_UNLOCK_MAX_LINKS ),
		'title'     => sanitize_text_field( wp_unslash( $_POST['title'] ?? '' ) ),
		'before'    => storyweb_unlock_clean_html( wp_unslash( $_POST['before'] ?? '' ) ),
		'image'     => esc_url_raw( trim( (string) wp_unslash( $_POST['image'] ?? '' ) ), array( 'http', 'https' ) ),
		'show_link' => ! empty( $_POST['show_link'] ),
		'button'    => sanitize_text_field( wp_unslash( $_POST['button'] ?? '' ) ),
		'after'     => storyweb_unlock_clean_html( wp_unslash( $_POST['after'] ?? '' ) ),
		'revision'  => (int) $old['revision'],
	);
	$revoke = ! empty( $_POST['revoke'] );
	if ( $revoke || $new['enabled'] !== (bool) $old['enabled'] || $new['links'] !== array_values( $old['links'] ) ) {
		++$new['revision'];
	}
	update_option( STORYWEB_UNLOCK_OPTION, $new, true );
	wp_safe_redirect(
		add_query_arg(
			array(
				'post_type' => 'story',
				'page'      => 'storyweb-unlock',
				'saved'     => 1,
				'bad'       => $bad,
				'revoked'   => $revoke ? 1 : 0,
			),
			admin_url( 'edit.php' )
		)
	);
	exit;
}

/** A locked chapter to try the gate on (the newest story's first locked chapter), or ''. */
function storyweb_unlock_sample_url() {
	$stories = get_posts(
		array(
			'post_type'      => 'story',
			'post_status'    => 'publish',
			'posts_per_page' => 5,
			'orderby'        => 'modified',
		)
	);
	foreach ( $stories as $story ) {
		$next = storyweb_story_meta( $story )['free_chapters'] + 1;
		if ( storyweb_find_chapter( $story->ID, $next ) ) {
			return storyweb_chapter_url( $story, $next );
		}
	}
	return '';
}

function storyweb_unlock_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Bạn không có quyền.', '', array( 'response' => 403 ) );
	}
	wp_enqueue_media();
	$s      = storyweb_unlock_settings();
	$links  = array_pad( array_values( $s['links'] ), STORYWEB_UNLOCK_MAX_LINKS, '' );
	$sample = storyweb_unlock_sample_url();
	// phpcs:disable WordPress.Security.NonceVerification.Recommended -- display-only flags after our own redirect.
	$saved   = ! empty( $_GET['saved'] );
	$bad     = isset( $_GET['bad'] ) ? absint( $_GET['bad'] ) : 0;
	$revoked = ! empty( $_GET['revoked'] );
	// phpcs:enable
	?>
	<div class="wrap">
		<h1>Mở khóa chương bằng liên kết</h1>
		<p>Ở chương bị khóa, người đọc thấy một cửa sổ che màn hình với nội dung bên dưới. Bấm liên kết, ảnh hoặc nút sẽ mở <strong>một trong các liên kết của bạn (chọn ngẫu nhiên mỗi lần)</strong> trong tab mới; quay lại trang là chương tự mở và người đọc đọc được mọi chương khóa trong thời gian bạn đặt.</p>
		<?php if ( $saved ) : ?>
			<div class="notice notice-success is-dismissible"><p>Đã lưu.<?php echo $revoked ? ' Mọi lượt mở khóa trước đó đã bị thu hồi.' : ''; ?></p></div>
		<?php endif; ?>
		<?php if ( $bad ) : ?>
			<div class="notice notice-error"><p><?php echo (int) $bad; ?> liên kết không được lưu: chỉ nhận địa chỉ <code>https://</code> công khai (không IP, không localhost).</p></div>
		<?php endif; ?>
		<?php if ( $s['enabled'] && ! $s['links'] ) : ?>
			<div class="notice notice-warning"><p>Đã bật nhưng chưa có liên kết nào hợp lệ, nên chương khóa vẫn hiện "tạm tắt".</p></div>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="storyweb_unlock_save">
			<?php wp_nonce_field( 'storyweb_unlock_save' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">Bật mở khóa</th>
					<td><label><input type="checkbox" name="enabled" value="1" <?php checked( $s['enabled'] ); ?>> Cho người đọc mở chương khóa bằng liên kết</label></td>
				</tr>
				<tr>
					<th scope="row"><label for="sw-unlock-minutes">Thời gian đọc sau mỗi lần bấm</label></th>
					<td><input type="number" id="sw-unlock-minutes" name="minutes" min="1" max="1440" value="<?php echo (int) $s['minutes']; ?>" class="small-text"> phút <p class="description">1 đến 1440 phút (24 giờ). Hết giờ, người đọc bấm lại liên kết.</p></td>
				</tr>
				<tr>
					<th scope="row">Liên kết (tối đa <?php echo (int) STORYWEB_UNLOCK_MAX_LINKS; ?>)</th>
					<td>
						<?php foreach ( $links as $i => $link ) : ?>
							<p><input type="url" name="links[]" value="<?php echo esc_attr( $link ); ?>" class="regular-text code" placeholder="https://s.shopee.vn/…" aria-label="Liên kết <?php echo (int) $i + 1; ?>"></p>
						<?php endforeach; ?>
						<p class="description">Mỗi lần người đọc mở cửa sổ khóa, một liên kết được chọn ngẫu nhiên. Chỉ nhận <code>https://</code>. Đổi danh sách liên kết sẽ thu hồi các lượt mở khóa đang có.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="sw-unlock-title">Tiêu đề cửa sổ</label></th>
					<td><input type="text" id="sw-unlock-title" name="title" value="<?php echo esc_attr( $s['title'] ); ?>" class="regular-text"></td>
				</tr>
				<tr>
					<th scope="row">Nội dung phía trên</th>
					<td><?php storyweb_unlock_editor( $s['before'], 'storyweb_unlock_before', 'before', 6 ); ?><p class="description">In đậm, đổi màu chữ (nút "A" trên thanh công cụ), xuống dòng như soạn bài viết.</p></td>
				</tr>
				<tr>
					<th scope="row">Hiện địa chỉ liên kết</th>
					<td><label><input type="checkbox" name="show_link" value="1" <?php checked( $s['show_link'] ); ?>> Hiện đường link (chữ đỏ, bấm được) giữa nội dung và ảnh</label></td>
				</tr>
				<tr>
					<th scope="row"><label for="sw-unlock-image">Ảnh (bấm được)</label></th>
					<td>
						<input type="url" id="sw-unlock-image" name="image" value="<?php echo esc_attr( $s['image'] ); ?>" class="regular-text code">
						<button type="button" class="button" id="sw-unlock-pick">Chọn ảnh</button>
						<button type="button" class="button-link" id="sw-unlock-clear">Bỏ ảnh</button>
						<p><img id="sw-unlock-preview" src="<?php echo esc_url( $s['image'] ); ?>" alt="" style="max-width:260px;height:auto;<?php echo $s['image'] ? '' : 'display:none;'; ?>"></p>
						<p class="description">Ví dụ ảnh sản phẩm Shopee. Bấm vào ảnh cũng mở liên kết.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="sw-unlock-button">Chữ trên nút</label></th>
					<td><input type="text" id="sw-unlock-button" name="button" value="<?php echo esc_attr( $s['button'] ); ?>" class="regular-text"></td>
				</tr>
				<tr>
					<th scope="row">Nội dung phía dưới</th>
					<td><?php storyweb_unlock_editor( $s['after'], 'storyweb_unlock_after', 'after', 3 ); ?></td>
				</tr>
				<tr>
					<th scope="row">Thu hồi</th>
					<td><label><input type="checkbox" name="revoke" value="1"> Thu hồi mọi lượt mở khóa đang có khi lưu (mọi người phải bấm lại)</label></td>
				</tr>
			</table>
			<?php submit_button( 'Lưu cài đặt' ); ?>
		</form>
		<?php if ( $sample ) : ?>
			<p>Xem thử: mở <a href="<?php echo esc_url( $sample ); ?>" target="_blank" rel="noopener">một chương khóa</a> trong <strong>cửa sổ ẩn danh</strong> (tài khoản quản trị luôn đọc được chương khóa nên không thấy cửa sổ này).</p>
		<?php endif; ?>
		<p class="description">Mỗi địa chỉ IP được mở khóa tối đa 15 lần mỗi giờ để chống bot cào truyện. Trang không kiểm tra được người đọc có thật sự xem trang đích hay không.</p>
	</div>
	<script>
	( function () {
		var input = document.getElementById( 'sw-unlock-image' );
		var preview = document.getElementById( 'sw-unlock-preview' );
		var frame;
		var show = function () { preview.src = input.value; preview.style.display = input.value ? '' : 'none'; };
		input.addEventListener( 'change', show );
		document.getElementById( 'sw-unlock-clear' ).addEventListener( 'click', function () { input.value = ''; show(); } );
		document.getElementById( 'sw-unlock-pick' ).addEventListener( 'click', function () {
			if ( ! frame ) {
				frame = wp.media( { title: 'Chọn ảnh cho cửa sổ mở khóa', library: { type: 'image' }, multiple: false } );
				frame.on( 'select', function () { input.value = frame.state().get( 'selection' ).first().toJSON().url; show(); } );
			}
			frame.open();
		} );
	} )();
	</script>
	<?php
}
