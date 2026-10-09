<?php
/**
 * Site header (port of components/site-header.tsx).
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

$thu_cac_links = array(
	array( home_url( '/' ), 'Trang chủ' ),
	array( thu_cac_search_url(), 'Khám phá' ),
	array( home_url( user_trailingslashit( 'tu-truyen' ) ), 'Tủ truyện' ),
	array( thu_cac_publish_url(), 'Đăng truyện' ),
);
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link screen-reader-text" href="#main-content">Bỏ qua tới nội dung</a>
<header class="site-header">
	<div class="container site-header__inner">
		<a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php echo esc_attr( get_bloginfo( 'name' ) . ' - Trang chủ' ); ?>">
			<span class="brand__mark"><?php thu_cac_the_icon( 'book-open', 24, array( 'stroke-width' => '1.6' ) ); ?></span>
			<span>THƯ <em>CÁC</em></span>
		</a>
		<nav class="main-nav" id="main-nav" aria-label="Điều hướng chính">
			<?php foreach ( $thu_cac_links as $thu_cac_link ) : ?>
				<a href="<?php echo esc_url( $thu_cac_link[0] ); ?>"<?php echo thu_cac_is_current( $thu_cac_link[0] ) ? ' class="is-active" aria-current="page"' : ''; ?>><?php echo esc_html( $thu_cac_link[1] ); ?></a>
			<?php endforeach; ?>
		</nav>
		<div class="site-header__actions">
			<button class="icon-button" type="button" data-theme-toggle aria-label="Chế độ tối">
				<span class="theme-icon theme-icon--moon"><?php thu_cac_the_icon( 'moon', 20 ); ?></span>
				<span class="theme-icon theme-icon--sun"><?php thu_cac_the_icon( 'sun', 20 ); ?></span>
			</button>
			<a class="icon-button header-search" href="<?php echo esc_url( thu_cac_search_url() ); ?>" aria-label="Tìm kiếm truyện"><?php thu_cac_the_icon( 'search', 20 ); ?></a>
			<a class="header-cta" href="<?php echo esc_url( thu_cac_search_url() ); ?>">Bắt đầu đọc <span>↗</span></a>
			<button class="icon-button menu-toggle" type="button" data-menu-toggle aria-controls="main-nav" aria-expanded="false" aria-label="Mở menu">
				<span class="menu-icon menu-icon--open"><?php thu_cac_the_icon( 'menu', 22 ); ?></span>
				<span class="menu-icon menu-icon--close"><?php thu_cac_the_icon( 'x', 22 ); ?></span>
			</button>
		</div>
	</div>
</header>
<main id="main-content">
