<?php
/**
 * Enqueue — Assets front + admin.
 *
 * Tous les assets sont dans le dossier du plugin :
 *   assets/css/     — global.css, components.css, compatibilite-amoureuse.css, theme-dialotel.css
 *   assets/js/      — core.js, compatibilite-amoureuse.js
 *   assets/textures/ — cosmic-gradient.svg, etc.
 *   animations/     — transition-dialotel.css, loader-dialotel.css, etc.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ============================================================
   ADMIN ASSETS
   ============================================================ */
add_action( 'admin_enqueue_scripts', 'vt_enqueue_admin_assets' );

function vt_enqueue_admin_assets( $hook ) {
	if ( $hook !== 'toplevel_page_voyance-tirages' ) return;

	wp_enqueue_style(
		'vt-admin-ui',
		VT_PLUGIN_URL . 'includes/admin-ui.css',
		array(),
		VT_VERSION
	);
}

/* ============================================================
   FRONT ASSETS — detecte le shortcode AVANT le rendu
   ============================================================ */
add_action( 'wp_enqueue_scripts', 'vt_enqueue_assets' );

function vt_enqueue_assets() {
	// Detection du shortcode via has_shortcode() (fiable contrairement a la globale)
	global $post;
	if ( ! is_a( $post, 'WP_Post' ) || ! has_shortcode( $post->post_content, 'tirage_voyance' ) ) return;

	// Google Fonts
	wp_enqueue_style(
		'vt-fonts',
		'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap',
		array(),
		null
	);

	// Theme Dialotel
	wp_enqueue_style( 'vt-theme', VT_PLUGIN_URL . 'assets/css/theme-dialotel.css', array(), VT_VERSION );

	// Global + Components
	wp_enqueue_style( 'vt-global', VT_PLUGIN_URL . 'assets/css/global.css', array( 'vt-theme' ), VT_VERSION );
	wp_enqueue_style( 'vt-components', VT_PLUGIN_URL . 'assets/css/components.css', array( 'vt-global' ), VT_VERSION );

	// Animations Dialotel
	wp_enqueue_style( 'vt-anim-transition', VT_PLUGIN_URL . 'animations/transition-dialotel.css', array(), VT_VERSION );
	wp_enqueue_style( 'vt-anim-loader', VT_PLUGIN_URL . 'animations/loader-dialotel.css', array(), VT_VERSION );
	wp_enqueue_style( 'vt-anim-reveal', VT_PLUGIN_URL . 'animations/reveal-dialotel.css', array(), VT_VERSION );
	wp_enqueue_style( 'vt-anim-card', VT_PLUGIN_URL . 'animations/card-dialotel.css', array(), VT_VERSION );

	// Core JS (dans le footer)
	wp_enqueue_script( 'vt-core', VT_PLUGIN_URL . 'assets/js/core.js', array(), VT_VERSION, true );

	// Proxy URLs + nonce injectes dans core.js
	$proxy_url   = admin_url( 'admin-ajax.php?action=vt_ai_proxy' );
	$email_proxy = admin_url( 'admin-ajax.php?action=vt_email_proxy' );

	wp_localize_script( 'vt-core', 'vtWpConfig', array(
		'proxyUrl'      => $proxy_url,
		'emailProxyUrl' => $email_proxy,
		'nonce'         => wp_create_nonce( 'vt_proxy_nonce' ),
	) );
}

/**
 * Enqueue specifique par type de tirage.
 * Appele par le shortcode renderer.
 */
function vt_enqueue_tirage_assets( $type ) {
	$map = array(
		'compatibilite-amoureuse'    => 'compatibilite-amoureuse',
		'compatibilite-astrologique'  => 'compatibilite-astrologique',
		'tirage-tarot'               => 'tirage-tarot',
		'numerologie'                => 'numerologie',
	);

	if ( ! isset( $map[ $type ] ) ) return;

	$slug = $map[ $type ];

	// CSS app
	wp_enqueue_style( 'vt-app-' . $slug, VT_PLUGIN_URL . 'assets/css/' . $slug . '.css', array( 'vt-components' ), VT_VERSION );

	// JS app (dans le footer)
	wp_enqueue_script( 'vt-app-' . $slug, VT_PLUGIN_URL . 'assets/js/' . $slug . '.js', array( 'vt-core' ), VT_VERSION, true );
}
