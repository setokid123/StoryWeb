<?php
/**
 * Locked-chapter popup. The chapter body is NOT in the page: the server only renders this gate.
 * Expects $args: chapter (int), story_url, state (storyweb_unlock_state()). In "link" mode the state carries the
 * admin's invitation (Truyện → Mở khóa chương): title, text before/after, image, link text, button; the link,
 * image and button all open the same randomly picked link through the plugin's /mo-khoa/ URL.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

$thu_cac_state   = $args['state'];
$thu_cac_mode    = $thu_cac_state['mode'];
$thu_cac_minutes = (int) ( $thu_cac_state['access_minutes'] ?? 5 );
$thu_cac_gate    = ( 'link' === $thu_cac_mode && ! empty( $thu_cac_state['visit_url'] ) ) ? (array) ( $thu_cac_state['gate'] ?? array() ) : null;
$thu_cac_visit   = $thu_cac_gate ? $thu_cac_state['visit_url'] : '';
$thu_cac_title   = $thu_cac_gate && ! empty( $thu_cac_gate['title'] ) ? $thu_cac_gate['title'] : 'Mở trang truyện tiếp theo';
?>
<div class="unlock-backdrop" data-unlock-gate data-mode="<?php echo esc_attr( $thu_cac_mode ); ?>">
	<div class="locked-panel locked-panel--dialog lg<?php echo $thu_cac_gate ? ' locked-panel--link' : ''; ?>" role="dialog" aria-modal="true" aria-labelledby="unlock-title" tabindex="-1">
		<?php if ( ! $thu_cac_gate || empty( $thu_cac_gate['image'] ) ) : ?>
			<span class="locked-panel__icon"><?php thu_cac_the_icon( 'lock-keyhole', 28 ); ?></span>
		<?php endif; ?>
		<div class="eyebrow">CHƯƠNG <?php echo (int) $args['chapter']; ?> · NỘI DUNG KHÓA</div>
		<h2 id="unlock-title"><?php echo esc_html( $thu_cac_title ); ?></h2>

		<?php if ( $thu_cac_gate ) : ?>
			<?php if ( ! empty( $thu_cac_gate['before'] ) ) : ?>
				<div class="locked-panel__content"><?php echo wp_kses_post( $thu_cac_gate['before'] ); ?></div>
			<?php endif; ?>
			<?php if ( ! empty( $thu_cac_gate['show_link'] ) && ! empty( $thu_cac_state['link'] ) ) : ?>
				<a class="locked-panel__url" href="<?php echo esc_url( $thu_cac_visit ); ?>" target="_blank" rel="noopener nofollow"><?php echo esc_html( $thu_cac_state['link'] ); ?></a>
			<?php endif; ?>
			<?php if ( ! empty( $thu_cac_gate['image'] ) ) : ?>
				<a class="locked-panel__image" href="<?php echo esc_url( $thu_cac_visit ); ?>" target="_blank" rel="noopener nofollow" tabindex="-1" aria-hidden="true"><img src="<?php echo esc_url( $thu_cac_gate['image'] ); ?>" alt="" decoding="async"></a>
			<?php endif; ?>
			<a class="button button--primary locked-panel__go" href="<?php echo esc_url( $thu_cac_visit ); ?>" target="_blank" rel="noopener nofollow"><?php echo esc_html( ! empty( $thu_cac_gate['button'] ) ? $thu_cac_gate['button'] : 'Mở liên kết và đọc tiếp' ); ?> <?php thu_cac_the_icon( 'arrow-up-right', 17 ); ?></a>
			<?php if ( ! empty( $thu_cac_gate['after'] ) ) : ?>
				<div class="locked-panel__content locked-panel__content--after"><?php echo wp_kses_post( $thu_cac_gate['after'] ); ?></div>
			<?php endif; ?>
			<span class="locked-panel__hint">Liên kết mở trong tab mới. Quay lại trang này là chương tự mở, đọc mọi chương trong <?php echo (int) $thu_cac_minutes; ?> phút.</span>
		<?php elseif ( 'rewarded' === $thu_cac_mode ) : ?>
			<p>Xem một quảng cáo ngắn để mở khóa quyền đọc tiếp trong <?php echo (int) $thu_cac_minutes; ?> phút. Khi hết thời gian, bạn có thể xem lại quảng cáo để tiếp tục.</p>
			<div class="rewarded-action">
				<button type="button" class="button button--primary" data-rewarded-watch disabled><?php thu_cac_the_icon( 'play-circle', 17 ); ?> Xem quảng cáo mở khóa</button>
			</div>
			<p class="form-error-inline" role="alert" data-rewarded-message>Hiện tại không có quảng cáo nào khả dụng. Vui lòng thử lại sau.</p>
			<span class="locked-panel__hint">Bạn cần xem hết video để nhận quyền đọc.</span>
		<?php else : ?>
			<p>Tính năng mở khóa chương hiện đang tạm tắt. Bạn có thể quay lại mục lục để chọn chương khác.</p>
			<a href="<?php echo esc_url( $args['story_url'] ); ?>" class="button button--glass">Quay lại mục lục</a>
		<?php endif; ?>

		<?php if ( 'off' !== $thu_cac_mode ) : ?>
			<div class="locked-panel__footer"><a href="<?php echo esc_url( $args['story_url'] ); ?>" class="button button--ghost">Quay lại mục lục</a></div>
		<?php endif; ?>
	</div>
</div>
