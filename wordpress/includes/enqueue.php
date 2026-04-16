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
add_action( 'wp_head', 'vt_inject_og_tags' );

function vt_enqueue_assets() {
	// Detection du shortcode via has_shortcode() (fiable contrairement a la globale)
	global $post;
	if ( ! is_a( $post, 'WP_Post' ) || ! has_shortcode( $post->post_content, 'tirage_voyance' ) ) return;

	// Google Fonts
	wp_enqueue_style(
		'vt-fonts',
		'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@400;700&display=swap',
		array(),
		null
	);

	// Global + Components
	wp_enqueue_style( 'vt-global', VT_PLUGIN_URL . 'assets/css/global.css', array(), VT_VERSION );
	wp_enqueue_style( 'vt-components', VT_PLUGIN_URL . 'assets/css/components.css', array( 'vt-global' ), VT_VERSION );

	// Theme Dialotel — chargé APRES global+components (comme dans la preview)
	wp_enqueue_style( 'vt-theme', VT_PLUGIN_URL . 'assets/css/theme-dialotel.css', array( 'vt-components' ), VT_VERSION );

	// Neutralise les propriétés WP qui piègent position:fixed + supprime les anneaux originaux piégés
	wp_add_inline_style( 'vt-theme', '
body { background-color: #ffffff !important; margin: 0 !important; }
#page, .wp-site-blocks, #content, #primary, main,
.site-main, .entry-content, .wp-block-post-content,
.is-layout-constrained, .has-global-padding,
.wp-block-group, .wp-block-template-part,
.wp-block-query, .wp-block-post, .wp-block-page-list {
    transform: none !important;
    filter: none !important;
    contain: none !important;
    will-change: auto !important;
    perspective: none !important;
}

' );

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

/* ============================================================
   ANNEAUX MANDALA — injectes comme enfants directs du <body>
   (position:fixed fonctionne toujours sur les enfants de <body>,
    quel que soit le theme WP — pas de piégeage possible)
   ============================================================ */
add_action( 'wp_body_open', 'vt_inject_mandala_rings' );

function vt_inject_mandala_rings() {
	global $post;
	if ( ! is_a( $post, 'WP_Post' ) || ! has_shortcode( $post->post_content, 'tirage_voyance' ) ) return;
	echo '<div aria-hidden="true" class="vt-ring-bg vt-ring-bg--1"></div>' . "\n";
	echo '<div aria-hidden="true" class="vt-ring-bg vt-ring-bg--2"></div>' . "\n";
	echo '<div aria-hidden="true" class="vt-ring-bg vt-ring-bg--3"></div>' . "\n";
}

/* ============================================================
   OPEN GRAPH — meta tags pour le partage social
   ============================================================ */
function vt_inject_og_tags() {
	global $post;
	if ( ! is_a( $post, 'WP_Post' ) || ! has_shortcode( $post->post_content, 'tirage_voyance' ) ) return;

	$title = get_option( 'vt_meta_title' ) ?: get_option( 'vt_app_title', 'Compatibilite Amoureuse' );
	$desc  = get_option( 'vt_meta_desc' ) ?: '';
	$url   = get_permalink( $post );
	$image = get_option( 'vt_brand_logo' ) ?: '';

	echo '<meta property="og:title" content="' . esc_attr( $title ) . '">' . "\n";
	echo '<meta property="og:description" content="' . esc_attr( $desc ) . '">' . "\n";
	echo '<meta property="og:url" content="' . esc_url( $url ) . '">' . "\n";
	if ( $image ) {
		echo '<meta property="og:image" content="' . esc_url( $image ) . '">' . "\n";
	}
	echo '<meta property="og:type" content="website">' . "\n";
}
