<?php
/**
 * LOCAL PLAYGROUND ONLY: plain WebP covers (a two-colour gradient and a few shapes, drawn with GD) for the sample
 * stories TT2D1–TT2D6, attached as featured images. TT2D7 and TT2D8 stay without a cover (posts without a photo).
 * Blueprint: { "step": "runPHP", "code": "<?php require '/wordpress/wp-load.php'; require '/seed/seed-covers.php';" }
 */

defined( 'ABSPATH' ) || exit;

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/media.php';

$palettes = array(
	array( array( 40, 30, 80 ), array( 230, 120, 90 ) ),
	array( array( 20, 60, 90 ), array( 120, 200, 210 ) ),
	array( array( 90, 30, 60 ), array( 240, 180, 120 ) ),
	array( array( 30, 70, 50 ), array( 200, 220, 140 ) ),
	array( array( 60, 40, 100 ), array( 240, 150, 200 ) ),
	array( array( 100, 50, 20 ), array( 250, 210, 120 ) ),
);
$prefix = defined( 'STORYWEB_CODE_PREFIX' ) ? STORYWEB_CODE_PREFIX : 'TT2D';
$done   = 0;
for ( $n = 1; $n <= 6; $n++ ) {
	$story = get_page_by_path( strtolower( $prefix . $n ), OBJECT, 'story' );
	if ( ! $story || has_post_thumbnail( $story ) ) {
		continue;
	}
	list( $top, $bottom ) = $palettes[ ( $n - 1 ) % count( $palettes ) ];
	$w   = 600;
	$h   = 864;
	$img = imagecreatetruecolor( $w, $h );
	for ( $y = 0; $y < $h; $y++ ) {
		$t = $y / ( $h - 1 );
		$c = imagecolorallocate( $img, (int) ( $top[0] + ( $bottom[0] - $top[0] ) * $t ), (int) ( $top[1] + ( $bottom[1] - $top[1] ) * $t ), (int) ( $top[2] + ( $bottom[2] - $top[2] ) * $t ) );
		imageline( $img, 0, $y, $w, $y, $c );
	}
	$light = imagecolorallocatealpha( $img, 255, 255, 255, 80 );
	imagefilledellipse( $img, 420, 240, 260, 260, $light );
	imagefilledellipse( $img, 160, 620, 180 + 20 * $n, 180 + 20 * $n, $light );
	imagefilledrectangle( $img, 60, 760, 540, 790, $light );
	$tmp = wp_tempnam( 'cover-' . $n );
	$ext = function_exists( 'imagewebp' ) ? 'webp' : 'jpg';
	'webp' === $ext ? imagewebp( $img, $tmp, 80 ) : imagejpeg( $img, $tmp, 85 );
	imagedestroy( $img );
	$upload = wp_upload_bits( 'cover-tt2d' . $n . '.' . $ext, null, file_get_contents( $tmp ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local temp file.
	@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
	if ( ! empty( $upload['error'] ) ) {
		echo 'cover ', $n, ': ', $upload['error'], "\n";
		continue;
	}
	$attachment = wp_insert_attachment(
		array(
			'post_mime_type' => 'webp' === $ext ? 'image/webp' : 'image/jpeg',
			'post_title'     => 'Bìa ' . get_the_title( $story ),
			'post_status'    => 'inherit',
		),
		$upload['file'],
		$story->ID
	);
	wp_update_attachment_metadata( $attachment, wp_generate_attachment_metadata( $attachment, $upload['file'] ) );
	set_post_thumbnail( $story, $attachment );
	++$done;
}
echo 'seed-covers: ', $done, " covers\n";
