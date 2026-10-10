<?php
/**
 * Site footer: a glass "last stop" panel with the logo, links and the station sign line.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

$thu_cac_contact = sanitize_email( (string) get_theme_mod( 'thu_cac_contact_email', '' ) );
?>
</main>
<footer class="site-footer">
	<div class="container">
		<div class="site-footer__panel lg">
			<div class="site-footer__brand">
				<a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php echo esc_attr( thu_cac_brand_name() . ' - Trang chủ' ); ?>"><?php thu_cac_brand( 44 ); ?></a>
				<p>Mỗi chương là một chặng, mỗi truyện là một chuyến đi. Lên tàu và đọc tới trạm cuối.</p>
			</div>
			<nav class="site-footer__links" aria-label="Liên kết chân trang">
				<a href="<?php echo esc_url( thu_cac_search_url() ); ?>"><?php thu_cac_the_icon( 'compass', 17 ); ?> Khám phá truyện</a>
				<a href="<?php echo esc_url( home_url( user_trailingslashit( 'tu-truyen' ) ) ); ?>"><?php thu_cac_the_icon( 'library-big', 17 ); ?> Tủ truyện</a>
				<a href="<?php echo esc_url( thu_cac_publish_url() ); ?>"><?php thu_cac_the_icon( 'pen-line', 17 ); ?> Đăng truyện</a>
				<?php if ( $thu_cac_contact ) : ?>
					<a href="<?php echo esc_url( 'mailto:' . $thu_cac_contact ); ?>"><?php thu_cac_the_icon( 'map-pin', 17 ); ?> Liên hệ</a>
				<?php endif; ?>
			</nav>
			<div class="site-footer__sign" aria-hidden="true">
				<span class="site-footer__line"></span>
				<span class="site-footer__stop">Ga cuối</span>
				<span class="site-footer__line"></span>
			</div>
			<span class="footer-copy">© <?php echo esc_html( wp_date( 'Y' ) ); ?> <?php echo esc_html( thu_cac_brand_name() ); ?> · Đọc truyện trên nền kính trong veo</span>
		</div>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
