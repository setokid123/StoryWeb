<?php
/**
 * Plugin Name:       StoryWeb Core
 * Description:       Truyện và chương: kiểu nội dung, mã truyện TT2D1, TT2D2…, đường dẫn /truyen/ và /doc/, khóa chương phía máy chủ, mở khóa bằng link (Truyện → Mở khóa chương), đăng truyện lên Page Facebook, tay hoặc tự động theo mã (Truyện → Đăng Facebook), thống kê lượt đọc và lượt bấm mở khóa (Truyện → Thống kê).
 * Version:           0.5.5
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            StoryWeb
 * License:           GPL-2.0-or-later
 * Text Domain:       storyweb-core
 * Update URI:        false
 *
 * Business rules live here, not in the theme: switching themes must never expose a locked chapter.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

define( 'STORYWEB_CORE_VERSION', '0.5.5' );
define( 'STORYWEB_CORE_DIR', plugin_dir_path( __FILE__ ) );

require_once STORYWEB_CORE_DIR . 'inc/content-model.php';
require_once STORYWEB_CORE_DIR . 'inc/story-code.php';
require_once STORYWEB_CORE_DIR . 'inc/routing.php';
require_once STORYWEB_CORE_DIR . 'inc/access.php';
require_once STORYWEB_CORE_DIR . 'inc/unlock.php';
require_once STORYWEB_CORE_DIR . 'inc/stats.php';
require_once STORYWEB_CORE_DIR . 'inc/facebook.php';
require_once STORYWEB_CORE_DIR . 'inc/facebook-queue.php';
require_once STORYWEB_CORE_DIR . 'inc/hardening.php';
require_once STORYWEB_CORE_DIR . 'inc/admin.php';
require_once STORYWEB_CORE_DIR . 'inc/unlock-admin.php';
require_once STORYWEB_CORE_DIR . 'inc/facebook-admin.php';
require_once STORYWEB_CORE_DIR . 'inc/facebook-edit.php';
require_once STORYWEB_CORE_DIR . 'inc/stats-admin.php';

register_activation_hook(
	__FILE__,
	static function () {
		storyweb_register_content_model();
		storyweb_register_rewrites();
		flush_rewrite_rules();
	}
);

register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
