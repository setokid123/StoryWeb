<?php
/**
 * Chapter list drawer (port of components/chapter-list-dialog.tsx). The list is fetched from
 * /wp-json/thu-cac/v1/chapters when opened, so long stories do not add thousands of rows to every reader page.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;
?>
<div class="drawer-backdrop" id="chapter-list-dialog" data-chapter-dialog hidden>
	<div class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="chapter-list-title">
		<header class="drawer-panel__header">
			<div>
				<div class="eyebrow"><?php echo esc_html( $args['story_title'] ); ?></div>
				<h2 id="chapter-list-title">Danh sách chương</h2>
			</div>
			<button type="button" class="icon-button drawer-panel__close" data-chapter-list-close aria-label="Đóng danh sách chương"><?php thu_cac_the_icon( 'x', 24 ); ?></button>
		</header>
		<div class="drawer-panel__content">
			<p class="drawer-panel__status" data-chapter-list-status role="status">Đang tải danh sách chương…</p>
			<ul class="chapter-list" data-chapter-list></ul>
		</div>
	</div>
</div>
<template id="chapter-lock-icon"><?php thu_cac_the_icon( 'lock-keyhole', 16, array( 'class' => 'chapter-list__lock-icon' ) ); ?></template>
