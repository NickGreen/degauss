<?php
/**
 * Degauss plugin bootstrap file.
 *
 * @wordpress-plugin
 * Plugin Name:       Degauss
 * Plugin URI:        https://github.com/nickgreen/degauss
 * Description:       Momentary RGB-split glitch over the whole page, on a random timer.
 * Version:           1.1.0
 * Author:            Nick Green
 * Author URI:        https://nickgreen.info
 * License:           GPL-3.0-or-later
 * Text Domain:       degauss
 */

defined( 'ABSPATH' ) || exit;

define( 'DEGAUSS_VERSION', '1.1.0' );
define( 'DEGAUSS_DIR', plugin_dir_path( __FILE__ ) );
define( 'DEGAUSS_URL', plugin_dir_url( __FILE__ ) );

require_once DEGAUSS_DIR . 'includes/settings.php';

/**
 * Default levels, each 1 (least) to 10 (most).
 */
function degauss_defaults() {
	return array(
		'frequency' => 1,
		'intensity' => 1,
	);
}

/**
 * Clamp submitted levels to whole numbers between 1 and 10.
 */
function degauss_sanitize( $input ) {
	$out = array();
	foreach ( degauss_defaults() as $key => $default ) {
		$value       = isset( $input[ $key ] ) ? (int) $input[ $key ] : $default;
		$out[ $key ] = max( 1, min( 10, $value ) );
	}
	return $out;
}

/**
 * Saved levels merged over the defaults.
 */
function degauss_settings() {
	$saved = get_option( 'degauss_settings', array() );
	return degauss_sanitize( wp_parse_args( is_array( $saved ) ? $saved : array(), degauss_defaults() ) );
}

/**
 * Enqueue the script with a config object inlined before it.
 */
function degauss_enqueue_script( $config ) {
	wp_enqueue_script(
		'degauss',
		DEGAUSS_URL . 'assets/degauss.js',
		array(),
		DEGAUSS_VERSION,
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
	wp_add_inline_script( 'degauss', 'window.DegaussConfig = ' . wp_json_encode( $config ) . ';', 'before' );
}

/**
 * Front-end enqueue, filterable; return false from the filter to skip a request.
 */
function degauss_enqueue() {
	$config = apply_filters( 'degauss_config', degauss_settings() );
	if ( false === $config ) {
		return;
	}
	degauss_enqueue_script( $config );
}
add_action( 'wp_enqueue_scripts', 'degauss_enqueue' );
