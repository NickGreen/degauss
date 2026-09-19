<?php
/**
 * Settings > Degauss screen with the frequency and intensity sliders.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register the option and its two fields.
 */
function degauss_register_settings() {
	register_setting(
		'degauss',
		'degauss_settings',
		array(
			'type'              => 'array',
			'sanitize_callback' => 'degauss_sanitize',
			'default'           => degauss_defaults(),
		)
	);
	add_settings_section( 'degauss_main', '', '__return_false', 'degauss' );
	add_settings_field( 'frequency', 'Frequency', 'degauss_field_frequency', 'degauss', 'degauss_main', array( 'label_for' => 'degauss-frequency' ) );
	add_settings_field( 'intensity', 'Intensity', 'degauss_field_intensity', 'degauss', 'degauss_main', array( 'label_for' => 'degauss-intensity' ) );
}
add_action( 'admin_init', 'degauss_register_settings' );

/**
 * Add the page under Settings.
 */
function degauss_add_menu() {
	add_options_page( 'Degauss', 'Degauss', 'manage_options', 'degauss', 'degauss_render_page' );
}
add_action( 'admin_menu', 'degauss_add_menu' );

/**
 * Print one 1-10 range slider with its current value and a description.
 */
function degauss_slider( $key, $low, $high ) {
	$settings = degauss_settings();
	printf(
		'<input type="range" id="degauss-%1$s" name="degauss_settings[%1$s]" data-key="%1$s" class="degauss-slider" min="1" max="10" step="1" value="%2$d"> <output for="degauss-%1$s" class="degauss-value">%2$d</output><p class="description">1: %3$s. 10: %4$s.</p>',
		esc_attr( $key ),
		(int) $settings[ $key ],
		esc_html( $low ),
		esc_html( $high )
	);
}

function degauss_field_frequency() {
	degauss_slider( 'frequency', 'every 30 to 90 seconds', 'every 1 to 3 seconds' );
}

function degauss_field_intensity() {
	degauss_slider( 'intensity', 'a brief, subtle colour split', 'long bursts with large offsets, smearing and tearing' );
}

/**
 * Render the settings form and the test button.
 */
function degauss_render_page() {
	?>
	<div class="wrap">
		<h1>Degauss</h1>
		<form action="options.php" method="post">
			<?php
			settings_fields( 'degauss' );
			do_settings_sections( 'degauss' );
			submit_button();
			?>
		</form>
		<p>
			<button type="button" class="button" id="degauss-test">Test burst</button>
			<span class="description">Uses the slider positions as they are now, saved or not.</span>
		</p>
	</div>
	<?php
}

/**
 * Load the script and the slider helper on the settings page only.
 */
function degauss_admin_assets( $hook ) {
	if ( 'settings_page_degauss' !== $hook ) {
		return;
	}
	$config              = degauss_settings();
	$config['autostart'] = 0;
	degauss_enqueue_script( $config );
	wp_enqueue_script( 'degauss-admin', DEGAUSS_URL . 'assets/admin.js', array( 'degauss' ), DEGAUSS_VERSION, true );
	wp_add_inline_style( 'wp-admin', '.degauss-slider{width:20em;vertical-align:middle}.degauss-value{display:inline-block;min-width:2em;font-weight:600}' );
}
add_action( 'admin_enqueue_scripts', 'degauss_admin_assets' );
