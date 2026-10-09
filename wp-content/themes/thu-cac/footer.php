<?php
/**
 * Site footer (port of components/site-footer.tsx).
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

$thu_cac_contact = sanitize_email( (string) get_theme_mod( 'thu_cac_contact_email', '' ) );
?>
</main>
<footer class="site-footer">
	<div class="container site-footer__inner">
		<div><div class="footer-brand"><?php thu_cac_the_icon( 'book-open', 21 ); ?> THƯ CÁC</div><p>Một chốn nhỏ cho những câu chuyện lớn.</p></div>
		<div class="footer-links">
			<a href="<?php echo esc_url( thu_cac_search_url() ); ?>">Khám phá truyện</a>
			<a href="<?php echo esc_url( home_url( user_trailingslashit( 'tu-truyen' ) ) ); ?>">Tủ truyện</a>
			<a href="<?php echo esc_url( thu_cac_publish_url() ); ?>">Đăng truyện</a>
			<?php if ( $thu_cac_contact ) : ?>
				<a href="<?php echo esc_url( 'mailto:' . $thu_cac_contact ); ?>">Liên hệ</a>
			<?php endif; ?>
		</div>
		<span class="footer-copy">© <?php echo esc_html( wp_date( 'Y' ) ); ?> <?php bloginfo( 'name' ); ?></span>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
