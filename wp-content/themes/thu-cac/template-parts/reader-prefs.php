<?php
/**
 * Reader preferences panel (port of components/reader-preferences-view.tsx). Rendered hidden; reader.js opens
 * it, marks the active options and saves choices in localStorage (storyweb:reader-prefs:v1).
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

/**
 * One segmented button. $label may contain fixed icon markup.
 */
$thu_cac_pref_btn = static function ( $pref, $value, $label, $attrs = '', $class = '' ) {
	printf(
		'<button type="button" class="pref-btn%5$s" data-pref="%1$s" data-value="%2$s" aria-pressed="false" %3$s>%4$s</button>',
		esc_attr( $pref ),
		esc_attr( $value ),
		$attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal attributes below.
		$label, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal text or fixed icons.
		$class ? ' ' . esc_attr( $class ) : ''
	);
};
?>
<div id="reader-preferences" hidden>
<div class="reader-prefs-backdrop" data-prefs-close>
<div class="reader-prefs" role="dialog" aria-modal="true" aria-labelledby="prefs-title">
	<header class="reader-prefs__header">
		<h2 id="prefs-title">Tùy chỉnh đọc</h2>
		<button type="button" class="icon-button" data-prefs-close aria-label="Đóng tùy chỉnh"><?php thu_cac_the_icon( 'x', 20 ); ?></button>
	</header>
	<div class="reader-prefs__body">
		<section class="pref-section">
			<div class="pref-section__title">Nền và màu chữ</div>
			<div class="pref-segmented" role="group" aria-label="Chế độ nền">
				<?php
				$thu_cac_pref_btn( 'theme', 'light', thu_cac_icon( 'sun', 18 ) . ' Sáng' );
				$thu_cac_pref_btn( 'theme', 'dark', thu_cac_icon( 'moon', 18 ) . ' Tối' );
				$thu_cac_pref_btn( 'theme', 'system', thu_cac_icon( 'monitor', 18 ) . ' Hệ thống' );
				?>
			</div>
		</section>
		<section class="pref-section">
			<div class="pref-section__title">Kiểu chữ</div>
			<div class="pref-grid-2">
				<div class="pref-segmented" role="group" aria-label="Phông chữ">
					<?php
					$thu_cac_pref_btn( 'fontFamily', 'lora', 'Văn học', '', 'pref-btn--font-serif' );
					$thu_cac_pref_btn( 'fontFamily', 'inter', 'Hiện đại', '', 'pref-btn--font-sans' );
					?>
				</div>
				<div class="pref-segmented" role="group" aria-label="Độ đậm">
					<?php
					$thu_cac_pref_btn( 'fontWeight', 'normal', 'Thường', 'style="font-weight:normal"' );
					$thu_cac_pref_btn( 'fontWeight', 'bold', 'Đậm', 'style="font-weight:bold"' );
					?>
				</div>
			</div>
		</section>
		<section class="pref-section">
			<div class="pref-section__title">Kích thước</div>
			<div class="pref-grid-2">
				<div class="pref-stepper">
					<button type="button" class="pref-btn" data-font-step="-1" aria-label="Giảm cỡ chữ">A−</button>
					<div class="pref-stepper__value" aria-live="polite"><?php thu_cac_the_icon( 'type', 16 ); ?> <span data-font-size-value>19</span>px</div>
					<button type="button" class="pref-btn" data-font-step="1" aria-label="Tăng cỡ chữ">A+</button>
				</div>
				<div class="pref-segmented" role="group" aria-label="Giãn dòng">
					<?php
					$thu_cac_pref_btn( 'lineHeight', 'tight', thu_cac_icon( 'list', 18, array( 'style' => 'transform:scaleY(0.7)' ) ), 'aria-label="Giãn dòng hẹp"' );
					$thu_cac_pref_btn( 'lineHeight', 'normal', thu_cac_icon( 'list', 18 ), 'aria-label="Giãn dòng vừa"' );
					$thu_cac_pref_btn( 'lineHeight', 'loose', thu_cac_icon( 'list', 18, array( 'style' => 'transform:scaleY(1.3)' ) ), 'aria-label="Giãn dòng rộng"' );
					?>
				</div>
			</div>
		</section>
		<section class="pref-section">
			<div class="pref-section__title">Bố cục</div>
			<div class="pref-grid-2">
				<div class="pref-segmented" role="group" aria-label="Độ rộng cột">
					<?php
					$thu_cac_pref_btn( 'columnWidth', 'narrow', 'Hẹp' );
					$thu_cac_pref_btn( 'columnWidth', 'medium', 'Vừa' );
					$thu_cac_pref_btn( 'columnWidth', 'wide', 'Rộng' );
					?>
				</div>
				<div class="pref-segmented" role="group" aria-label="Căn lề">
					<?php
					$thu_cac_pref_btn( 'textAlignment', 'left', thu_cac_icon( 'align-left', 18 ), 'aria-label="Căn trái"' );
					$thu_cac_pref_btn( 'textAlignment', 'justify', thu_cac_icon( 'align-justify', 18 ), 'aria-label="Căn đều hai bên"' );
					?>
				</div>
			</div>
		</section>
	</div>
	<footer class="reader-prefs__footer">
		<button type="button" class="pref-reset-btn" data-prefs-reset><?php thu_cac_the_icon( 'rotate-ccw', 14 ); ?> Khôi phục mặc định</button>
	</footer>
</div>
</div>
</div>
