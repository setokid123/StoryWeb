<?php
/**
 * Locked-chapter dialog (port of components/unlock-gate-view.tsx). The chapter body is NOT in the page: the
 * server only renders this gate. Expects $args: chapter (int), story_url, state (storyweb_unlock_state()).
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

$thu_cac_state   = $args['state'];
$thu_cac_mode    = $thu_cac_state['mode'];
$thu_cac_minutes = (int) ( $thu_cac_state['access_minutes'] ?? 5 );
?>
<div class="unlock-backdrop" data-unlock-gate data-mode="<?php echo esc_attr( $thu_cac_mode ); ?>">
	<div class="locked-panel locked-panel--dialog" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
		<span class="locked-panel__icon"><?php thu_cac_the_icon( 'lock-keyhole', 28 ); ?></span>
		<div class="eyebrow">CHƯƠNG <?php echo (int) $args['chapter']; ?> · NỘI DUNG KHÓA</div>
		<h2 id="unlock-title">Mở trang truyện tiếp theo</h2>

		<?php if ( 'link' === $thu_cac_mode && $thu_cac_state['visit_url'] ) : ?>
			<p>Mở liên kết giới thiệu một lần để đọc các chương khóa trong <?php echo (int) $thu_cac_minutes; ?> phút. Khi hết thời gian, bạn cần nhấp lại liên kết trước khi sang chương mới.</p>
			<a class="button button--primary" href="<?php echo esc_url( $thu_cac_state['visit_url'] ); ?>" target="_blank" rel="noopener noreferrer">Mở liên kết giới thiệu <?php thu_cac_the_icon( 'arrow-up-right', 17 ); ?></a>
			<span class="locked-panel__hint">Trang sẽ mở trong tab mới. Quay lại đây để tiếp tục đọc.</span>
		<?php elseif ( 'rewarded' === $thu_cac_mode ) : ?>
			<p>Xem một quảng cáo ngắn để mở khóa quyền đọc tiếp trong <?php echo (int) $thu_cac_minutes; ?> phút. Khi hết thời gian, bạn có thể xem lại quảng cáo để tiếp tục.</p>
			<div class="rewarded-action">
				<button type="button" class="button button--primary" data-rewarded-watch disabled><?php thu_cac_the_icon( 'play-circle', 17 ); ?> Xem quảng cáo mở khóa</button>
			</div>
			<p class="form-error-inline" role="alert" data-rewarded-message>Hiện tại không có quảng cáo nào khả dụng. Vui lòng thử lại sau.</p>
			<span class="locked-panel__hint">Bạn cần xem hết video để nhận quyền đọc.</span>
		<?php else : ?>
			<p>Tính năng mở khóa chương hiện đang tạm tắt. Bạn có thể quay lại mục lục để chọn chương khác.</p>
			<a href="<?php echo esc_url( $args['story_url'] ); ?>" class="button button--outline">Quay lại mục lục</a>
		<?php endif; ?>

		<?php if ( 'off' !== $thu_cac_mode ) : ?>
			<div class="locked-panel__footer"><a href="<?php echo esc_url( $args['story_url'] ); ?>" class="button button--ghost">Quay lại mục lục</a></div>
		<?php endif; ?>
	</div>
</div>
