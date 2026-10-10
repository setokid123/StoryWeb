<?php
/**
 * Site header: a floating liquid-glass bar. On phones the main navigation becomes a glass tab bar at the bottom
 * of the screen (same <nav>, moved by CSS), except on the reader page, which has its own dock.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

$thu_cac_links = array(
	array( home_url( '/' ), 'Trang chủ', 'house' ),
	array( thu_cac_search_url(), 'Khám phá', 'compass' ),
	array( home_url( user_trailingslashit( 'xem-nhieu' ) ), 'Xem nhiều', 'flame' ),
	array( home_url( user_trailingslashit( 'tu-truyen' ) ), 'Tủ truyện', 'library-big' ),
);
// "Đăng truyện" opens wp-admin, so only people who can write stories see it; readers never do.
if ( current_user_can( 'edit_posts' ) ) {
	$thu_cac_links[] = array( thu_cac_publish_url(), 'Đăng truyện', 'pen-line' );
}
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div class="sky" aria-hidden="true"><i class="sky__orb sky__orb--a"></i><i class="sky__orb sky__orb--b"></i><i class="sky__orb sky__orb--c"></i><i class="sky__tone"></i></div>
<a class="skip-link screen-reader-text" href="#main-content">Bỏ qua tới nội dung</a>
<header class="site-header">
	<div class="site-header__bar">
		<span class="site-header__glass lg" data-refract aria-hidden="true"></span>
		<a class="brand" translate="no" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php echo esc_attr( thu_cac_brand_name() . ' - Trang chủ' ); ?>"><?php thu_cac_brand( 38 ); ?></a>
		<nav class="main-nav" id="main-nav" aria-label="Điều hướng chính">
			<span class="main-nav__glass lg" data-refract aria-hidden="true"></span>
			<?php foreach ( $thu_cac_links as $thu_cac_link ) : ?>
				<a class="main-nav__link<?php echo thu_cac_is_current( $thu_cac_link[0] ) ? ' is-active' : ''; ?>" href="<?php echo esc_url( $thu_cac_link[0] ); ?>"<?php echo thu_cac_is_current( $thu_cac_link[0] ) ? ' aria-current="page"' : ''; ?>><?php thu_cac_the_icon( $thu_cac_link[2], 20, array( 'class' => 'main-nav__icon' ) ); ?><span><?php echo esc_html( $thu_cac_link[1] ); ?></span></a>
			<?php endforeach; ?>
		</nav>
		<div class="site-header__actions">
			<a class="icon-btn lg lg-glow" href="<?php echo esc_url( thu_cac_search_url() ); ?>" aria-label="Tìm kiếm truyện"><?php thu_cac_the_icon( 'search', 19 ); ?></a>
			<button class="icon-btn lg lg-glow" type="button" data-theme-toggle aria-label="Chế độ tối">
				<span class="theme-icon theme-icon--moon"><?php thu_cac_the_icon( 'moon', 19 ); ?></span>
				<span class="theme-icon theme-icon--sun"><?php thu_cac_the_icon( 'sun', 19 ); ?></span>
			</button>
			<a class="button button--primary header-cta" href="<?php echo esc_url( thu_cac_search_url() ); ?>">Đọc ngay <?php thu_cac_the_icon( 'arrow-up-right', 17 ); ?></a>
		</div>
	</div>
</header>
<main id="main-content">
