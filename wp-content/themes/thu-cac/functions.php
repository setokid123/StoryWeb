<?php
/**
 * Thư Các theme bootstrap. Presentation only: access rules live in the StoryWeb Core plugin.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

define( 'THU_CAC_VERSION', '0.1.0' );

require_once get_template_directory() . '/inc/icons.php';
require_once get_template_directory() . '/inc/template-tags.php';
require_once get_template_directory() . '/inc/views.php';
require_once get_template_directory() . '/inc/rest.php';

add_action(
	'after_setup_theme',
	static function () {
		add_theme_support( 'title-tag' );
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
		add_theme_support( 'responsive-embeds' );
		register_nav_menus( array( 'primary' => 'Menu chính' ) );
	}
);

// Giao diện → Tùy biến: contact email for the footer "Liên hệ" link (hidden when empty).
add_action(
	'customize_register',
	static function ( $wp_customize ) {
		$wp_customize->add_section( 'thu_cac', array( 'title' => 'Thư Các' ) );
		$wp_customize->add_setting(
			'thu_cac_contact_email',
			array(
				'default'           => '',
				'sanitize_callback' => 'sanitize_email',
			)
		);
		$wp_customize->add_control(
			'thu_cac_contact_email',
			array(
				'label'   => 'Email liên hệ (chân trang)',
				'section' => 'thu_cac',
				'type'    => 'email',
			)
		);
	}
);

add_filter(
	'document_title_separator',
	static function () {
		return '|';
	}
);

/** Fonts and styles. dark-overrides.css is loaded first to keep the cascade of the Next.js @import. */
add_action(
	'wp_enqueue_scripts',
	static function () {
		$uri = get_template_directory_uri() . '/assets';
		wp_enqueue_style(
			'thu-cac-fonts',
			'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap',
			array(),
			null // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- Google Fonts URL is versioned by its query.
		);
		wp_enqueue_style( 'thu-cac-dark', $uri . '/css/dark-overrides.css', array( 'thu-cac-fonts' ), THU_CAC_VERSION );
		wp_enqueue_style( 'thu-cac', $uri . '/css/globals.css', array( 'thu-cac-dark' ), THU_CAC_VERSION );
		wp_enqueue_style( 'thu-cac-wp', $uri . '/css/wp.css', array( 'thu-cac' ), THU_CAC_VERSION );
		// next/font exposed the families as CSS variables; keep the same names so globals.css is unchanged.
		wp_add_inline_style( 'thu-cac-fonts', ':root{--font-lora:"Lora";--font-inter:"Inter"}' );

		wp_enqueue_script_module( 'thu-cac-site', $uri . '/js/site.js', array(), THU_CAC_VERSION );
		if ( is_singular( 'chapter' ) ) {
			wp_enqueue_script_module( 'thu-cac-reader', $uri . '/js/reader.js', array(), THU_CAC_VERSION );
		}
	}
);

/**
 * Applies the stored theme before first paint (no light flash in dark mode). Same keys as the Next.js app, so
 * readers keep their choice: storyweb-theme = light|dark (absent = system), legacy storyweb:night = true|false.
 */
add_action(
	'wp_head',
	static function () {
		?>
<script>try{var t=localStorage.getItem('storyweb-theme');if(t!=='dark'&&t!=='light'){var l=t==='system'?null:localStorage.getItem('storyweb:night');if(l==='true')t='dark';else if(l==='false')t='light';else t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}</script>
		<?php
	},
	1
);

add_action(
	'after_switch_theme',
	static function () {
		thu_cac_register_view_rewrites();
		flush_rewrite_rules();
	}
);
