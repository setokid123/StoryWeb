<?php
/**
 * Story card (port of components/story-card.tsx). Expects $args['story'] from thu_cac_story().
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

$thu_cac_story = $args['story'];
?>
<a class="story-card" href="<?php echo esc_url( $thu_cac_story['url'] ); ?>" data-slug="<?php echo esc_attr( $thu_cac_story['slug'] ); ?>">
	<?php thu_cac_cover( $thu_cac_story, 'story-card__cover' ); ?>
	<div class="story-card__body">
		<div class="story-card__topline"><span><?php echo esc_html( $thu_cac_story['genre'] ); ?></span><?php thu_cac_the_icon( 'arrow-up-right', 17, array( 'stroke-width' => '1.7' ) ); ?></div>
		<h3><?php echo esc_html( $thu_cac_story['title'] ); ?></h3>
		<p><?php echo esc_html( $thu_cac_story['author'] ); ?></p>
		<div class="story-card__meta"><span><?php thu_cac_the_icon( 'star', 14, array( 'fill' => 'currentColor' ) ); ?> <?php echo esc_html( $thu_cac_story['rating'] ); ?></span><span><?php echo (int) $thu_cac_story['chapters']; ?> chương</span></div>
	</div>
</a>
