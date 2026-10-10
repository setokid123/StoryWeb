<?php
/**
 * Ad Inserter (wordpress.org/plugins/ad-inserter): wires blocks 1–4 to the theme's four ad slots through custom hooks
 * (`thu_cac_ad_slot_<placement>`, see thu_cac_ad_slot() in the theme). The admin then only pastes the ad network's
 * code into a block (Cài đặt → Ad Inserter). A block with no code prints nothing and the theme hides the slot.
 * Code already in blocks 1–4 is kept; other blocks and settings are untouched. Safe to run again.
 *
 * Run once after activating Ad Inserter, with WordPress loaded:
 *   Playground blueprint: runPHP "<?php require '/wordpress/wp-load.php'; require '/seed/setup-ad-inserter.php';"
 *   Server (PHP CLI as the web user): require wp-load.php, then this file.
 *
 * @package StoryWebCore
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'ai_save_options' ) || ! function_exists( 'ai_get_option' ) || ! class_exists( 'ai_Block' ) ) {
	echo "Ad Inserter is not active.\n";
	return;
}

$storyweb_ai_slots = array(
	1 => array( 'home_feed', 'Trang chủ' ),
	2 => array( 'story_detail', 'Trang truyện' ),
	3 => array( 'reader_end', 'Cuối chương' ),
	4 => array( 'search_results', 'Tìm kiếm' ),
);

$storyweb_ai_options = ai_get_option( AI_OPTION_NAME, array() );
if ( ! is_array( $storyweb_ai_options ) ) {
	$storyweb_ai_options = array();
}
if ( ! isset( $storyweb_ai_options[ AI_OPTION_GLOBAL ] ) || ! is_array( $storyweb_ai_options[ AI_OPTION_GLOBAL ] ) ) {
	$storyweb_ai_options[ AI_OPTION_GLOBAL ] = array();
}
$storyweb_ai_default = ( new ai_Block( 1 ) )->wp_options;

foreach ( $storyweb_ai_slots as $storyweb_ai_n => $storyweb_ai_slot ) {
	list( $storyweb_ai_placement, $storyweb_ai_label ) = $storyweb_ai_slot;

	// Custom hook N fires on the theme's per-placement action.
	$storyweb_ai_options[ AI_OPTION_GLOBAL ][ 'HOOK_ENABLED_' . $storyweb_ai_n ]  = AI_ENABLED;
	$storyweb_ai_options[ AI_OPTION_GLOBAL ][ 'HOOK_NAME_' . $storyweb_ai_n ]     = $storyweb_ai_label;
	$storyweb_ai_options[ AI_OPTION_GLOBAL ][ 'HOOK_ACTION_' . $storyweb_ai_n ]   = 'thu_cac_ad_slot_' . $storyweb_ai_placement;
	$storyweb_ai_options[ AI_OPTION_GLOBAL ][ 'HOOK_PRIORITY_' . $storyweb_ai_n ] = 10;

	// Block N: inserted automatically at custom hook N on every page type (the hook itself only fires where the
	// theme has that slot; reader_end only on chapters the reader may read).
	$storyweb_ai_block = isset( $storyweb_ai_options[ $storyweb_ai_n ] ) && is_array( $storyweb_ai_options[ $storyweb_ai_n ] ) ? $storyweb_ai_options[ $storyweb_ai_n ] : array();
	$storyweb_ai_options[ $storyweb_ai_n ] = array_merge(
		$storyweb_ai_default,
		$storyweb_ai_block,
		array(
			AI_OPTION_BLOCK_NAME                 => 'Ô quảng cáo: ' . $storyweb_ai_label,
			AI_OPTION_AUTOMATIC_INSERTION        => AI_AUTOMATIC_INSERTION_CUSTOM_HOOK + $storyweb_ai_n - 1,
			AI_OPTION_DISPLAY_ON_POSTS           => AI_ENABLED,
			AI_OPTION_DISPLAY_ON_PAGES           => AI_ENABLED,
			AI_OPTION_DISPLAY_ON_HOMEPAGE        => AI_ENABLED,
			AI_OPTION_DISPLAY_ON_CATEGORY_PAGES  => AI_ENABLED,
			AI_OPTION_DISPLAY_ON_SEARCH_PAGES    => AI_ENABLED,
			AI_OPTION_DISPLAY_ON_ARCHIVE_PAGES   => AI_ENABLED,
		)
	);
}

ai_save_options( $storyweb_ai_options );
echo "Ad Inserter: blocks 1-4 wired to the theme's ad slots.\n";
