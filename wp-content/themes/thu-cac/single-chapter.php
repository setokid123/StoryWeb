<?php
/**
 * Reader page: glass toolbar and dock over the story's ambient light, the chapter on a paper-glass sheet.
 *
 * Access is decided by StoryWeb Core on the server for this request. A locked chapter's body is never printed:
 * the page then contains the gate only. Without the plugin the theme fails closed (nothing beyond the title).
 *
 * @package ThuCac
 */

defined( 'ABSPATH' ) || exit;

get_header();

$thu_cac_chapter = get_queried_object();
$thu_cac_core    = function_exists( 'storyweb_can_read_chapter' ) && function_exists( 'storyweb_chapter_story' );
$thu_cac_story   = $thu_cac_core ? storyweb_chapter_story( $thu_cac_chapter ) : null;
$thu_cac_number  = (int) $thu_cac_chapter->menu_order;
$thu_cac_body    = $thu_cac_core ? storyweb_chapter_body( $thu_cac_chapter ) : null;
$thu_cac_state   = $thu_cac_core ? storyweb_unlock_state() : array( 'mode' => 'off', 'visit_url' => '', 'expires_at' => null, 'access_minutes' => 5 );
$thu_cac_s_url   = $thu_cac_story ? get_permalink( $thu_cac_story ) : home_url( '/' );
$thu_cac_s_title = $thu_cac_story ? get_the_title( $thu_cac_story ) : '';
$thu_cac_free    = $thu_cac_story ? storyweb_story_meta( $thu_cac_story )['free_chapters'] : 1;

// Neighbours by number (handles gaps in numbering).
$thu_cac_prev = '';
$thu_cac_next = '';
if ( $thu_cac_story ) {
	global $wpdb;
	$thu_cac_neighbours = $wpdb->get_row(
		$wpdb->prepare(
			"SELECT
				(SELECT MAX(menu_order) FROM {$wpdb->posts} WHERE post_type = 'chapter' AND post_status = 'publish' AND post_parent = %d AND menu_order > 0 AND menu_order < %d) AS prev_n,
				(SELECT MIN(menu_order) FROM {$wpdb->posts} WHERE post_type = 'chapter' AND post_status = 'publish' AND post_parent = %d AND menu_order > %d) AS next_n",
			$thu_cac_story->ID,
			$thu_cac_number,
			$thu_cac_story->ID,
			$thu_cac_number
		)
	);
	$thu_cac_prev = $thu_cac_neighbours && $thu_cac_neighbours->prev_n ? storyweb_chapter_url( $thu_cac_story, (int) $thu_cac_neighbours->prev_n ) : '';
	$thu_cac_next = $thu_cac_neighbours && $thu_cac_neighbours->next_n ? storyweb_chapter_url( $thu_cac_story, (int) $thu_cac_neighbours->next_n ) : '';
}

$thu_cac_locked     = null === $thu_cac_body;
$thu_cac_by_grant   = ! $thu_cac_locked && $thu_cac_number > $thu_cac_free && ! empty( $thu_cac_state['expires_at'] );
$thu_cac_expires_ms = $thu_cac_by_grant ? (int) $thu_cac_state['expires_at'] * 1000 : null;
$thu_cac_data       = array(
	'storyId'        => $thu_cac_story ? $thu_cac_story->ID : 0,
	'storySlug'      => $thu_cac_story ? $thu_cac_story->post_name : '',
	'storyUrl'       => $thu_cac_s_url,
	'chapter'        => $thu_cac_number,
	'locked'         => $thu_cac_locked,
	'mode'           => $thu_cac_state['mode'],
	'grantExpiresAt' => $thu_cac_expires_ms,
	'chaptersApi'    => rest_url( 'thu-cac/v1/chapters' ),
);
?>
<?php thu_cac_ambient( $thu_cac_story ? thu_cac_story( $thu_cac_story ) : null ); ?>
<div class="reader-progress" aria-hidden="true"></div>
<div class="reader-veil" aria-hidden="true"></div>
<div class="reader-shell">
	<div class="container reader-shell__inner">
		<div class="reader-toolbar" data-reader-toolbar data-scroll-state="top">
			<span class="reader-toolbar__glass lg" data-refract aria-hidden="true"></span>
			<a class="reader-toolbar__back" href="<?php echo esc_url( $thu_cac_s_url ); ?>"><?php thu_cac_the_icon( 'chevron-left', 18 ); ?> Mục lục</a>
			<span class="reader-toolbar__title" aria-hidden="true"><b><?php echo esc_html( $thu_cac_s_title ); ?></b> · Chương <?php echo (int) $thu_cac_number; ?></span>
			<div class="reader-toolbar__prefs-anchor" data-prefs-anchor>
				<div class="reader-toolbar__settings">
					<button type="button" class="icon-btn lg lg-glow" data-theme-toggle aria-label="Chế độ tối">
						<span class="theme-icon theme-icon--moon"><?php thu_cac_the_icon( 'moon', 18 ); ?></span>
						<span class="theme-icon theme-icon--sun"><?php thu_cac_the_icon( 'sun', 18 ); ?></span>
					</button>
					<button type="button" class="icon-btn lg lg-glow" data-prefs-toggle aria-label="Tùy chỉnh đọc" aria-haspopup="dialog" aria-expanded="false" aria-controls="reader-preferences"><?php thu_cac_the_icon( 'sliders-horizontal', 18 ); ?></button>
				</div>
				<?php get_template_part( 'template-parts/reader-prefs' ); ?>
			</div>
		</div>

		<article class="reader-article">
			<div class="reader-article__kicker"><span class="reader-article__story"><?php echo esc_html( $thu_cac_s_title ); ?></span><span class="reader-article__no">Chương <?php echo (int) $thu_cac_number; ?></span></div>
			<h1><?php echo esc_html( get_the_title( $thu_cac_chapter ) ); ?></h1>
			<div class="reader-rule" aria-hidden="true"><i></i>✦<i></i></div>
			<?php if ( $thu_cac_locked ) : ?>
				<?php
				get_template_part(
					'template-parts/unlock-gate',
					null,
					array(
						'chapter'   => $thu_cac_number,
						'story_url' => $thu_cac_s_url,
						'state'     => $thu_cac_state,
					)
				);
				?>
			<?php else : ?>
				<?php if ( $thu_cac_by_grant ) : ?>
					<div class="reader-access-note" data-grant-note><?php thu_cac_the_icon( 'clock3', 15 ); ?> Đã mở quyền đọc các chương tiếp theo đến <span data-grant-until><?php echo esc_html( wp_date( 'H:i', (int) $thu_cac_state['expires_at'] ) ); ?></span>.</div>
				<?php endif; ?>
				<div class="reader-text" data-reader-text data-pref-font="lora" data-pref-weight="normal" data-pref-line-height="normal" data-pref-width="medium" data-pref-align="justify" style="font-size:19px">
					<?php
					// Standard content filters (paragraphs, shortcodes, in-content ad plugins). StoryWeb Core's own
					// the_content filter re-checks access, so this can never print a locked body.
					echo apply_filters( 'the_content', $thu_cac_body ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- editor content, same as the_content().
					?>
				</div>
				<div class="reader-end">Hết chương <?php echo (int) $thu_cac_number; ?></div>
			<?php endif; ?>
		</article>

		<?php
		if ( ! $thu_cac_locked ) {
			thu_cac_ad_slot( 'reader_end' );
		}
		$thu_cac_nav = array(
			'story_url' => $thu_cac_s_url,
			'prev_url'  => $thu_cac_prev,
			'next_url'  => $thu_cac_next,
		);
		get_template_part( 'template-parts/reader-nav', null, $thu_cac_nav + array( 'variant' => 'end' ) );
		?>
	</div>
	<?php
	get_template_part( 'template-parts/reader-nav', null, $thu_cac_nav + array( 'variant' => 'dock' ) );
	get_template_part( 'template-parts/chapter-dialog', null, array( 'story_title' => $thu_cac_s_title ) );
	?>
</div>
<script type="application/json" id="thu-cac-reader-data"><?php echo wp_json_encode( $thu_cac_data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE ); ?></script>
<?php
get_footer();
