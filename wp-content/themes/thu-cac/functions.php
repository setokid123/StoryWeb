<?php
/**
 * Trạm Truyện 2D theme bootstrap (folder thu-cac, kept so existing sites stay on it). Presentation only: access
 * rules live in the StoryWeb Core plugin.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

define( 'THU_CAC_VERSION', '0.3.2' );

require_once get_template_directory() . '/inc/icons.php';
require_once get_template_directory() . '/inc/template-tags.php';
require_once get_template_directory() . '/inc/views.php';
require_once get_template_directory() . '/inc/rest.php';
require_once get_template_directory() . '/inc/share.php';
require_once get_template_directory() . '/inc/ranking.php';

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

// Giao diện → Tùy biến → Trạm Truyện 2D: logo name and the footer "Liên hệ" email (hidden when empty).
add_action(
	'customize_register',
	static function ( $wp_customize ) {
		$wp_customize->add_section( 'thu_cac', array( 'title' => 'Trạm Truyện 2D' ) );
		$wp_customize->add_setting(
			'thu_cac_brand',
			array(
				'default'           => 'Trạm Truyện 2D',
				'sanitize_callback' => 'sanitize_text_field',
			)
		);
		$wp_customize->add_control(
			'thu_cac_brand',
			array(
				'label'       => 'Tên trên logo',
				'description' => 'Chữ "2D" ở cuối tên được vẽ thành nhãn kính.',
				'section'     => 'thu_cac',
				'type'        => 'text',
			)
		);
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

/**
 * Google Fonts with Vietnamese subsets: Unbounded (display), Be Vietnam Pro (interface and "Hiện đại" reading),
 * and Lora (the "Văn học" reading font) only on chapter pages.
 */
function thu_cac_fonts_url() {
	$families = array(
		'family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400',
		'family=Unbounded:wght@500;700;800',
	);
	if ( is_singular( 'chapter' ) ) {
		$families[] = 'family=Lora:ital,wght@0,400;0,700;1,400';
	}
	return 'https://fonts.googleapis.com/css2?' . implode( '&', $families ) . '&display=swap';
}

add_action(
	'wp_enqueue_scripts',
	static function () {
		$uri = get_template_directory_uri() . '/assets';
		wp_enqueue_style( 'thu-cac-fonts', thu_cac_fonts_url(), array(), null ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- Google Fonts URL is versioned by its query.
		wp_enqueue_style( 'thu-cac', $uri . '/css/tram.css', array( 'thu-cac-fonts' ), THU_CAC_VERSION );

		// Shared modules are imported by id ("thu-cac-theme"), so the import map gives them the versioned URL and a
		// browser never mixes a new reader.js with a cached old reader-core.js.
		wp_register_script_module( 'thu-cac-theme', $uri . '/js/theme.js', array(), THU_CAC_VERSION );
		wp_register_script_module( 'thu-cac-reader-core', $uri . '/js/reader-core.js', array(), THU_CAC_VERSION );
		wp_enqueue_script_module( 'thu-cac-glass', $uri . '/js/glass.js', array(), THU_CAC_VERSION );
		wp_enqueue_script_module( 'thu-cac-site', $uri . '/js/site.js', array( 'thu-cac-theme' ), THU_CAC_VERSION );
		if ( is_singular( 'chapter' ) ) {
			wp_enqueue_script_module( 'thu-cac-reader', $uri . '/js/reader.js', array( 'thu-cac-theme', 'thu-cac-reader-core' ), THU_CAC_VERSION );
		}
	}
);

add_filter(
	'wp_resource_hints',
	static function ( $urls, $relation ) {
		if ( 'preconnect' === $relation ) {
			$urls[] = array(
				'href'        => 'https://fonts.gstatic.com',
				'crossorigin' => 'anonymous',
			);
		}
		return $urls;
	},
	10,
	2
);

/**
 * Applies the stored theme before first paint (no light flash in dark mode). Same keys as the Next.js app, so
 * readers keep their choice: storyweb-theme = light|dark (absent = system), legacy storyweb:night = true|false.
 * On chapter pages also the "Không ghim" toolbar preference (storyweb:reader-prefs:v1), so the header does not jump.
 * Also the browser bar colour and, when no Site Icon is set, the theme's logo as favicon.
 */
add_action(
	'wp_head',
	static function () {
		?>
<script>try{var t=localStorage.getItem('storyweb-theme');if(t!=='dark'&&t!=='light'){var l=t==='system'?null:localStorage.getItem('storyweb:night');if(l==='true')t='dark';else if(l==='false')t='light';else t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}</script>
<?php if ( is_singular( 'chapter' ) ) : ?>
<script>try{var p=JSON.parse(localStorage.getItem('storyweb:reader-prefs:v1')||'null');if(p&&p.toolbarMode==='auto')document.documentElement.setAttribute('data-reader-chrome','auto')}catch(e){}</script>
<?php endif; ?>
<meta name="theme-color" content="#f1ecff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d0b22" media="(prefers-color-scheme: dark)">
		<?php
		if ( ! has_site_icon() ) {
			$img = get_template_directory_uri() . '/assets/img/';
			printf( '<link rel="icon" href="%s" type="image/svg+xml">' . "\n", esc_url( $img . 'favicon.svg' ) );
			printf( '<link rel="icon" href="%s" type="image/png" sizes="32x32">' . "\n", esc_url( $img . 'favicon-32.png' ) );
			printf( '<link rel="apple-touch-icon" href="%s">' . "\n", esc_url( $img . 'apple-touch-icon.png' ) );
		}
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
