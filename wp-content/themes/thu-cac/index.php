<?php
/**
 * Fallback for blog posts, archives and any view without a dedicated template.
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<section class="section section--cream"><div class="container">
	<?php if ( have_posts() ) : ?>
		<?php if ( ! is_singular() ) : ?>
			<div class="page-heading"><h1><?php echo esc_html( wp_strip_all_tags( get_the_archive_title() ) ); ?></h1></div>
		<?php endif; ?>
		<?php while ( have_posts() ) : the_post(); ?>
			<article <?php post_class( 'entry' ); ?>>
				<?php if ( is_singular() ) : ?>
					<div class="page-heading"><h1><?php the_title(); ?></h1></div>
					<div class="entry-content"><?php the_content(); ?></div>
				<?php else : ?>
					<h2 class="entry-title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
					<div class="entry-summary"><?php the_excerpt(); ?></div>
				<?php endif; ?>
			</article>
		<?php endwhile; ?>
		<nav class="pager" aria-label="Trang"><?php echo wp_kses_post( paginate_links() ); ?></nav>
	<?php else : ?>
		<div class="empty-state"><h2>Chưa có nội dung</h2><a class="button button--primary" href="<?php echo esc_url( home_url( '/' ) ); ?>">Về trang chủ</a></div>
	<?php endif; ?>
</div></section>
<?php
get_footer();
