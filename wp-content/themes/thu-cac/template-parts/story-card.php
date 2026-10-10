<?php
/**
 * Story card: cover with the genre line, and a glass caption plate stuck on the cover's lower edge.
 * Expects $args['story'] from thu_cac_story().
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

$thu_cac_story = $args['story'];
?>
<a class="story-card" href="<?php echo esc_url( $thu_cac_story['url'] ); ?>" data-slug="<?php echo esc_attr( $thu_cac_story['slug'] ); ?>">
	<div class="story-card__media">
		<?php thu_cac_cover( $thu_cac_story, 'story-card__cover', array( 'sizes' => '(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 280px' ) ); ?>
		<div class="story-card__chips"><?php thu_cac_line_pill( $thu_cac_story['genre'], 'line-pill--sm' ); ?></div>
		<?php if ( $thu_cac_story['completed'] ) : ?><span class="story-card__done">Hoàn thành</span><?php endif; ?>
	</div>
	<div class="story-card__info lg">
		<h3 class="story-card__title"><?php echo esc_html( $thu_cac_story['title'] ); ?></h3>
		<p class="story-card__author"><?php echo esc_html( $thu_cac_story['author'] ); ?></p>
		<div class="story-card__meta"><span class="story-card__rating"><?php thu_cac_the_icon( 'star', 13, array( 'fill' => 'currentColor' ) ); ?> <?php echo esc_html( $thu_cac_story['rating'] ); ?></span><span><?php echo (int) $thu_cac_story['chapters']; ?> chương</span></div>
	</div>
</a>
