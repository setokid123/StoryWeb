<?php
/**
 * Not found (port of app/not-found.tsx).
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<div class="empty-state not-found"><span class="not-found__number">404</span><h1>Trang này đã lạc khỏi câu chuyện</h1><p>Hãy quay về và bắt đầu từ một trang khác.</p><a class="button button--primary" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php thu_cac_the_icon( 'arrow-left', 18 ); ?> Về trang chủ</a></div>
<?php
get_footer();
