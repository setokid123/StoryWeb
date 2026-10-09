<?php
/**
 * wp-admin: story and chapter fields (replaces the Next.js Studio panel for content entry).
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'add_meta_boxes',
	static function () {
		add_meta_box( 'storyweb-story', 'Thông tin truyện', 'storyweb_story_box', 'story', 'side', 'high' );
		add_meta_box( 'storyweb-chapter', 'Thuộc truyện', 'storyweb_chapter_box', 'chapter', 'side', 'high' );
	}
);

function storyweb_story_box( $post ) {
	$meta = storyweb_story_meta( $post );
	wp_nonce_field( 'storyweb_story_save', 'storyweb_story_nonce' );
	?>
	<p><label for="sw-author"><strong>Tác giả</strong></label><br>
		<input type="text" id="sw-author" name="sw_author" class="widefat" maxlength="160" value="<?php echo esc_attr( $meta['author'] ); ?>"></p>
	<p><label for="sw-free"><strong>Số chương miễn phí</strong></label><br>
		<input type="number" id="sw-free" name="sw_free_chapters" min="1" step="1" value="<?php echo esc_attr( $meta['free_chapters'] ); ?>">
		<br><small>Chương 1 đến số này đọc tự do; các chương sau cần mở khóa.</small></p>
	<p><label><input type="checkbox" name="sw_completed" value="1" <?php checked( $meta['completed'] ); ?>> Đã hoàn thành</label></p>
	<p><label><input type="checkbox" name="sw_featured" value="1" <?php checked( $meta['featured'] ); ?>> Truyện nổi bật (trang chủ)</label></p>
	<p><small>Số chương đã xuất bản: <?php echo (int) $meta['chapter_count']; ?></small></p>
	<?php
}

add_action(
	'save_post_story',
	static function ( $post_id ) {
		if ( ! isset( $_POST['storyweb_story_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['storyweb_story_nonce'] ), 'storyweb_story_save' ) ) {
			return;
		}
		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		update_post_meta( $post_id, STORYWEB_META_AUTHOR, sanitize_text_field( wp_unslash( $_POST['sw_author'] ?? '' ) ) );
		update_post_meta( $post_id, STORYWEB_META_FREE_CHAPTERS, storyweb_sanitize_free_chapters( wp_unslash( $_POST['sw_free_chapters'] ?? 1 ) ) );
		update_post_meta( $post_id, STORYWEB_META_COMPLETED, ! empty( $_POST['sw_completed'] ) );
		update_post_meta( $post_id, STORYWEB_META_FEATURED, ! empty( $_POST['sw_featured'] ) );
	}
);

function storyweb_chapter_box( $post ) {
	wp_nonce_field( 'storyweb_chapter_save', 'storyweb_chapter_nonce' );
	$stories = get_posts(
		array(
			'post_type'      => 'story',
			'post_status'    => array( 'publish', 'draft', 'pending', 'private' ),
			'posts_per_page' => 1000,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'fields'         => 'ids',
			'no_found_rows'  => true,
		)
	);
	$parent = (int) $post->post_parent;
	if ( ! $parent && isset( $_GET['sw_story'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- prefill only.
		$parent = absint( $_GET['sw_story'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	}
	$number = (int) $post->menu_order;
	if ( ! $number && $parent ) {
		$number = (int) get_post_meta( $parent, STORYWEB_META_CHAPTER_COUNT, true ) + 1;
	}
	?>
	<p><label for="sw-story"><strong>Truyện</strong></label><br>
		<select id="sw-story" name="sw_story" class="widefat" required>
			<option value="">— Chọn truyện —</option>
			<?php foreach ( $stories as $story_id ) : ?>
				<option value="<?php echo (int) $story_id; ?>" <?php selected( $parent, $story_id ); ?>><?php echo esc_html( get_the_title( $story_id ) ); ?></option>
			<?php endforeach; ?>
		</select></p>
	<p><label for="sw-number"><strong>Chương số</strong></label><br>
		<input type="number" id="sw-number" name="sw_number" min="1" step="1" value="<?php echo $number ? (int) $number : ''; ?>" required></p>
	<?php
}

add_filter(
	'wp_insert_post_data',
	static function ( $data, $postarr ) {
		if ( 'chapter' !== $data['post_type'] || ! isset( $_POST['storyweb_chapter_nonce'] ) ) {
			return $data;
		}
		if ( ! wp_verify_nonce( sanitize_key( $_POST['storyweb_chapter_nonce'] ), 'storyweb_chapter_save' ) ) {
			return $data;
		}
		$story = absint( $_POST['sw_story'] ?? 0 );
		if ( $story && 'story' === get_post_type( $story ) && current_user_can( 'edit_post', $story ) ) {
			$data['post_parent'] = $story;
		}
		$number = absint( $_POST['sw_number'] ?? 0 );
		if ( $number > 0 ) {
			$data['menu_order'] = min( $number, 999999 );
		}
		return $data;
	},
	10,
	2
);

// Chapter list columns: story and number, sortable by number.
add_filter(
	'manage_chapter_posts_columns',
	static function ( $columns ) {
		$columns['sw_story']  = 'Truyện';
		$columns['sw_number'] = 'Chương';
		return $columns;
	}
);
add_action(
	'manage_chapter_posts_custom_column',
	static function ( $column, $post_id ) {
		$post = get_post( $post_id );
		if ( 'sw_story' === $column && $post->post_parent ) {
			echo '<a href="' . esc_url( get_edit_post_link( $post->post_parent ) ) . '">' . esc_html( get_the_title( $post->post_parent ) ) . '</a>';
		}
		if ( 'sw_number' === $column ) {
			echo (int) $post->menu_order;
		}
	},
	10,
	2
);
add_filter(
	'manage_edit-chapter_sortable_columns',
	static function ( $columns ) {
		$columns['sw_number'] = 'menu_order';
		return $columns;
	}
);

// From a story, jump to "add chapter" with the story preselected.
add_filter(
	'post_row_actions',
	static function ( $actions, $post ) {
		if ( 'story' === $post->post_type && current_user_can( 'edit_posts' ) ) {
			$actions['sw_add_chapter'] = '<a href="' . esc_url( admin_url( 'post-new.php?post_type=chapter&sw_story=' . $post->ID ) ) . '">Thêm chương</a>';
		}
		return $actions;
	},
	10,
	2
);
