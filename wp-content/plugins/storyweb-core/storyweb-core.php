<?php
/**
 * Plugin Name:       StoryWeb Core
 * Description:       Truyện và chương: kiểu nội dung, đường dẫn /truyen/ và /doc/, khóa chương phía máy chủ, mở khóa bằng link (Truyện → Mở khóa chương).
 * Version:           0.2.0
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

define( 'STORYWEB_CORE_VERSION', '0.2.0' );
define( 'STORYWEB_CORE_DIR', plugin_dir_path( __FILE__ ) );

require_once STORYWEB_CORE_DIR . 'inc/content-model.php';
require_once STORYWEB_CORE_DIR . 'inc/routing.php';
require_once STORYWEB_CORE_DIR . 'inc/access.php';
require_once STORYWEB_CORE_DIR . 'inc/unlock.php';
require_once STORYWEB_CORE_DIR . 'inc/hardening.php';
require_once STORYWEB_CORE_DIR . 'inc/admin.php';
require_once STORYWEB_CORE_DIR . 'inc/unlock-admin.php';

register_activation_hook(
	__FILE__,
	static function () {
		storyweb_register_content_model();
		storyweb_register_rewrites();
		flush_rewrite_rules();
	}
);

register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
