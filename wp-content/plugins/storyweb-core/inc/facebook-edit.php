<?php
/**
 * Sửa bài đã đăng (Truyện → Đăng Facebook → "Sửa"): new text for a post made from the site, published or still
 * scheduled, from another source of the same story (description, opening of chapter 1, a whole FREE chapter) or
 * typed freely. Facebook keeps the photo, the comments and the scheduled time. Logic in inc/facebook.php.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_post_storyweb_fb_edit', 'storyweb_fb_admin_edit_save' );

function storyweb_fb_admin_edit_save() {
	storyweb_fb_admin_guard( 'storyweb_fb_edit' );
	$post_id = storyweb_fb_field( 'post_id' );
	$posts   = storyweb_fb_posts();
	$info    = $posts[ $post_id ] ?? null;
	$story   = $info ? get_post( (int) $info['story'] ) : null;
	if ( ! $info || ! $story || 'story' !== $story->post_type ) {
		storyweb_fb_notice( 'error', 'Không tìm thấy bài này trong các bài đã đăng từ site.' );
		storyweb_fb_back();
	}
	$source  = storyweb_fb_field( 'source' );
	$sources = storyweb_fb_sources( $story );
	if ( 'current' !== $source && ! isset( $sources[ $source ] ) ) {
		storyweb_fb_notice( 'error', 'Nguồn nội dung không hợp lệ: chỉ dùng được giới thiệu truyện hoặc chương miễn phí.' );
		storyweb_fb_back( array( 'sua' => $post_id ) );
	}
	$result = storyweb_fb_update_post( $post_id, storyweb_fb_text_field( 'message' ) );
	if ( is_wp_error( $result ) ) {
		storyweb_fb_notice( 'error', $result->get_error_message() );
		storyweb_fb_back( array( 'sua' => $post_id ) );
	}
	$label = 'current' === $source ? (string) $info['label'] : $sources[ $source ]['label'];
	storyweb_fb_remember_post(
		$post_id,
		array(
			'label'  => $label,
			'edited' => time(),
		)
	);
	storyweb_fb_log_update( $post_id, array( 'source' => $label . ' (đã sửa)' ) );
	storyweb_fb_notice( 'success', sprintf( 'Đã sửa nội dung bài "%s" trên Facebook.', html_entity_decode( get_the_title( $story ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ), 'https://www.facebook.com/' . rawurlencode( $post_id ) );
	storyweb_fb_back( array( 'sua' => $post_id ) );
}

/** The edit form for one post. */
function storyweb_fb_admin_editor( $post_id ) {
	$posts = storyweb_fb_posts();
	$info  = $posts[ $post_id ] ?? null;
	$story = $info ? get_post( (int) $info['story'] ) : null;
	?>
	<p><a href="<?php echo esc_url( $story ? storyweb_fb_admin_url( array( 'story' => $story->ID ) ) : storyweb_fb_admin_url() ); ?>">← Quay lại</a></p>
	<?php
	if ( ! $info || ! $story || 'story' !== $story->post_type ) {
		echo '<div class="notice notice-error inline"><p>Không tìm thấy bài này trong các bài đã đăng từ site.</p></div>';
		return;
	}
	if ( ! empty( $info['cancelled'] ) ) {
		echo '<div class="notice notice-warning inline"><p>Bài này đã bị hủy lịch nên không còn trên Facebook.</p></div>';
		return;
	}
	$sources = storyweb_fb_sources( $story );
	$inline  = empty( $info['link_in_comment'] );
	$texts   = array( 'current' => array( 'with' => storyweb_fb_post_message( $post_id ) ) );
	$texts['current']['without'] = $texts['current']['with'];
	foreach ( $sources as $key => $source ) {
		$texts[ $key ] = array(
			'with'    => storyweb_fb_message( $story, $source, true ),
			'without' => storyweb_fb_message( $story, $source, false ),
		);
	}
	$when = $info['scheduled'] ? $info['scheduled'] : $info['time'];
	?>
	<h2>Sửa bài: <?php echo esc_html( get_the_title( $story ) ); ?></h2>
	<p><?php echo esc_html( ( $info['scheduled'] && $info['scheduled'] > time() ? 'Lên lịch đăng lúc ' : 'Đăng lúc ' ) . wp_date( 'H:i d/m/Y', (int) $when ) ); ?> · đang dùng: <strong><?php echo esc_html( $info['label'] ); ?></strong><?php echo ! empty( $info['edited'] ) ? esc_html( ' · sửa lần cuối ' . wp_date( 'H:i d/m/Y', (int) $info['edited'] ) ) : ''; ?> · <a href="<?php echo esc_url( 'https://www.facebook.com/' . rawurlencode( $post_id ) ); ?>" target="_blank" rel="noopener">Mở trên Facebook</a></p>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="storyweb-fb-edit" style="max-width:820px">
		<input type="hidden" name="action" value="storyweb_fb_edit">
		<input type="hidden" name="post_id" value="<?php echo esc_attr( $post_id ); ?>">
		<?php wp_nonce_field( 'storyweb_fb_edit' ); ?>
		<p><strong>Đổi nội dung thành</strong></p>
		<label style="display:inline-block;margin:0 14px 8px 0"><input type="radio" name="source" value="current" checked> Nội dung đang đăng</label>
		<?php foreach ( $sources as $key => $source ) : ?>
			<label style="display:inline-block;margin:0 14px 8px 0"><input type="radio" name="source" value="<?php echo esc_attr( $key ); ?>"> <?php echo esc_html( $source['label'] ); ?></label>
		<?php endforeach; ?>
		<p><label><input type="checkbox" id="sw-fb-edit-inline" <?php checked( $inline ); ?>> Chèn dòng link đọc tiếp vào bài (bỏ tick nếu link đã nằm ở bình luận)</label></p>
		<textarea id="sw-fb-edit-message" name="message" rows="18" class="large-text"><?php echo esc_textarea( $texts['current']['with'] ); ?></textarea>
		<p class="description">Chỉ đổi chữ của bài. Ảnh, bình luận và giờ đăng (với bài đã lên lịch) giữ nguyên. Chỉ có chương miễn phí.</p>
		<?php submit_button( 'Lưu nội dung mới lên Facebook', 'primary', 'submit', false ); ?>
	</form>
	<script type="application/json" id="sw-fb-edit-texts"><?php echo wp_json_encode( $texts, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE ); ?></script>
	<script>
	( function () {
		var texts = JSON.parse( document.getElementById( 'sw-fb-edit-texts' ).textContent );
		var box = document.getElementById( 'sw-fb-edit-message' );
		var inline = document.getElementById( 'sw-fb-edit-inline' );
		var fill = function () {
			var radio = document.querySelector( '.storyweb-fb-edit [name=source]:checked' );
			var t = texts[ radio ? radio.value : 'current' ];
			box.value = t ? ( inline.checked ? t.with : t.without ) : box.value;
		};
		document.querySelectorAll( '.storyweb-fb-edit [name=source]' ).forEach( function ( radio ) { radio.addEventListener( 'change', fill ); } );
		inline.addEventListener( 'change', fill );
	} )();
	</script>
	<?php
}

/** "Bài đã đăng của truyện này" under the composer: each post made from the site for the story, with "Sửa". */
function storyweb_fb_admin_story_posts( $story ) {
	$rows = array_filter( storyweb_fb_posts(), static fn( $info ) => (int) $info['story'] === (int) $story->ID );
	if ( ! $rows ) {
		return;
	}
	uasort( $rows, static fn( $a, $b ) => ( $b['scheduled'] ? $b['scheduled'] : $b['time'] ) <=> ( $a['scheduled'] ? $a['scheduled'] : $a['time'] ) );
	?>
	<h2 style="margin-top:32px">Bài đã đăng của truyện này</h2>
	<table class="widefat striped" style="max-width:900px" data-story-posts>
		<thead><tr><th>Lúc</th><th>Nội dung</th><th></th></tr></thead>
		<tbody>
		<?php foreach ( $rows as $post_id => $info ) : ?>
			<tr>
				<td><?php echo esc_html( ( $info['scheduled'] && $info['scheduled'] > time() ? 'hẹn ' : '' ) . wp_date( 'H:i d/m/Y', (int) ( $info['scheduled'] ? $info['scheduled'] : $info['time'] ) ) ); ?></td>
				<td><?php echo esc_html( $info['label'] . ( ! empty( $info['edited'] ) ? ' (đã sửa)' : '' ) . ( ! empty( $info['cancelled'] ) ? ' · đã hủy lịch' : '' ) ); ?></td>
				<td style="text-align:right">
					<?php if ( empty( $info['cancelled'] ) ) : ?>
						<a class="button" href="<?php echo esc_url( storyweb_fb_admin_url( array( 'sua' => $post_id ) ) ); ?>">Sửa</a>
					<?php endif; ?>
					<a class="button-link" href="<?php echo esc_url( 'https://www.facebook.com/' . rawurlencode( $post_id ) ); ?>" target="_blank" rel="noopener">Mở</a>
				</td>
			</tr>
		<?php endforeach; ?>
		</tbody>
	</table>
	<?php
}
