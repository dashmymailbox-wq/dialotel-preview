<?php
/**
 * Plugin Name: Voyance Tirages — Hexagon Voyance
 * Plugin URI:  https://hexagon-voyance.com
 * Description: Application de compatibilite amoureuse integree dans WordPress. Page auto-creee, proxy IA server-side.
 * Version:     2.0.0
 * Author:      Hexagon Voyance
 * Text Domain: voyance-tirages
 * Requires at least: 5.0
 * Tested up to: 6.7
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'VT_VERSION', '2.2.0' );
define( 'VT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'VT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Chargement des includes
require_once VT_PLUGIN_DIR . 'includes/logger.php';
require_once VT_PLUGIN_DIR . 'includes/enqueue.php';
require_once VT_PLUGIN_DIR . 'includes/shortcodes.php';
require_once VT_PLUGIN_DIR . 'includes/proxy.php';
require_once VT_PLUGIN_DIR . 'includes/settings.php';

/* ============================================================
   ACTIVATION — Options par defaut + creation page
   ============================================================ */
register_activation_hook( __FILE__, 'vt_activate_plugin' );

function vt_activate_plugin() {
	$defaults = array(
		// Page & SEO — Compat. Amoureuse
		'vt_page_slug'        => 'tirage-compatibilite-amoureuse',
		'vt_page_title'       => 'Compatibilite Amoureuse',
		'vt_meta_title'       => '',
		'vt_meta_desc'        => '',
		// Page & SEO — Compat. Astrologique
		'vt_astro_page_slug'  => 'tirage-compatibilite-astrologique',
		'vt_astro_page_title' => 'Compatibilite Astrologique',
		// Page & SEO — Tarot
		'vt_tarot_page_slug'  => 'tirage-tarot',
		'vt_tarot_page_title' => 'Tirage Tarot',
		// Page & SEO — Numerologie
		'vt_numero_page_slug' => 'tirage-numerologie',
		'vt_numero_page_title' => 'Numerologie',
		// Branding
		'vt_brand_name'       => 'Hexagon Voyance',
		'vt_brand_logo'       => '',
		'vt_brand_favicon'    => '',
		// App
		'vt_app_title'        => 'Compatibilite Amoureuse',
		'vt_app_desc'         => '',
		'vt_app_btn_text'     => 'Decouvrir ma compatibilite',
		'vt_counter_base'     => 4200,
		'vt_discount_pct'     => 30,
		'vt_email_title'      => '',
		'vt_email_desc'       => '',
		'vt_email_btn'        => '',
		'vt_email_legal'      => '',
		// App toggles
		'vt_app_amoureuse_enabled' => false,
		'vt_app_astro_enabled'     => false,
		// CTA
		'vt_cta_enabled'      => false,
		'vt_cta_hook'         => '',
		'vt_cta_btn_text'     => '',
		'vt_cta_url'          => '#',
		'vt_astro_cta_enabled'     => false,
		'vt_astro_cta_hook'        => '',
		'vt_astro_cta_btn_text'    => '',
		'vt_astro_cta_url'         => '#',
		// FAQ
		'vt_faq_enabled'      => true,
		'vt_faq_title'        => '',
		'vt_astro_faq_enabled'     => true,
		'vt_astro_faq_title'       => '',
		// Share
		'vt_share_enabled'         => true,
		'vt_astro_share_enabled'   => true,
		// Email encart
		'vt_email_enabled'         => true,
		'vt_astro_email_enabled'   => true,
		// APIs
		'vt_ai_provider'      => 'mistral',
		'vt_ai_mistral_key'   => '',
		'vt_ai_mistral_model' => 'mistral-small-latest',
		'vt_ai_openai_key'    => '',
		'vt_ai_openai_model'  => 'gpt-4o-mini',
		'vt_ai_claude_key'    => '',
		'vt_ai_claude_model'  => 'claude-sonnet-4-6-20250514',
		'vt_brevo_key'        => '',
		'vt_brevo_list_id'    => '',
		// Avance
		'vt_tts_enabled'      => false,
		'vt_rate_limit_enabled' => false,
		'vt_rate_free'        => 3,
		'vt_rate_extended'    => 8,
		'vt_default_theme'    => 'light',
		'vt_theme_toggle'     => true,
	);

	foreach ( $defaults as $key => $val ) {
		if ( get_option( $key ) === false ) {
			add_option( $key, $val );
		}
	}

	// FAQ par defaut — Compatibilite Amoureuse
	$faq_amoureuse = array(
		1 => array(
			'q' => 'Comment calculer sa compatibilite amoureuse en ligne ?',
			'a' => 'Notre algorithme analyse les prenoms et dates de naissance de deux personnes pour calculer un score de compatibilite amoureuse. Le resultat comprend un resume personnalise, les points forts du couple et des conseils adaptes.',
		),
		2 => array(
			'q' => 'Le test de compatibilite de couple est-il fiable ?',
			'a' => 'Notre algorithme croise plusieurs criteres pour evaluer l\'affinite amoureuse entre deux personnes. Chaque analyse est unique et generee sur mesure a partir des informations fournies.',
		),
		3 => array(
			'q' => 'Comment savoir si deux personnes sont compatibles en amour ?',
			'a' => 'Il suffit d\'entrer les prenoms des deux personnes. Les dates de naissance sont optionnelles mais permettent d\'affiner le score d\'alchimie amoureuse et d\'obtenir une analyse de couple plus detaillee.',
		),
		4 => array(
			'q' => 'Le test d\'amour est-il gratuit et sans limite ?',
			'a' => 'Oui, notre test d\'affinite amoureuse est entierement gratuit. Vous pouvez tester autant de combinaisons de prenoms que vous le souhaitez et partager chaque resultat sur Facebook, WhatsApp, Instagram, TikTok et Snapchat.',
		),
		5 => array(
			'q' => 'Mes donnees sont-elles protegees lors du test de couple ?',
			'a' => 'Les informations fournies servent uniquement a calculer votre compatibilite de couple. Elles ne sont jamais stockees ni transmises a des tiers. Aucune donnee personnelle n\'est conservee apres le test d\'amour.',
		),
	);
	foreach ( $faq_amoureuse as $i => $faq ) {
		if ( get_option( "vt_faq_q{$i}" ) === false ) {
			add_option( "vt_faq_q{$i}", $faq['q'] );
		}
		if ( get_option( "vt_faq_a{$i}" ) === false ) {
			add_option( "vt_faq_a{$i}", $faq['a'] );
		}
	}

	// FAQ par defaut — Compatibilite Astrologique
	$faq_astro = array(
		1 => array(
			'q' => 'Comment fonctionne la compatibilite astrologique ?',
			'a' => 'Notre outil analyse les affinites entre vos signes du zodiaque selon les traditions astrologiques, en tenant compte des elements (Feu, Terre, Air, Eau) et des modalites de chaque signe.',
		),
		2 => array(
			'q' => 'Quels signes sont les plus compatibles ?',
			'a' => 'Certaines associations sont reconnues comme harmonieuses : Belier-Lion, Taureau-Vierge, Gemeaux-Balance... mais chaque relation reste unique et va au-dela du seul signe solaire.',
		),
		3 => array(
			'q' => 'Le tirage astrologique est-il fiable ?',
			'a' => 'Il reflete des traditions milleniaires de l\'astrologie occidentale. C\'est un outil de reflexion et d\'exploration, non une certitude absolue sur l\'avenir de votre relation.',
		),
		4 => array(
			'q' => 'Puis-je refaire le tirage plusieurs fois ?',
			'a' => 'Oui, plusieurs tirages gratuits sont disponibles par jour. Pour une analyse complete de votre theme astral et de vos relations, nos astrologues sont disponibles.',
		),
		5 => array(
			'q' => 'Faut-il connaitre l\'heure de naissance ?',
			'a' => 'Non, le signe solaire suffit pour ce tirage. Pour une analyse plus fine integrant l\'ascendant et les planetes, nos astrologues peuvent approfondir votre theme natal.',
		),
	);
	foreach ( $faq_astro as $i => $faq ) {
		if ( get_option( "vt_astro_faq_q{$i}" ) === false ) {
			add_option( "vt_astro_faq_q{$i}", $faq['q'] );
		}
		if ( get_option( "vt_astro_faq_a{$i}" ) === false ) {
			add_option( "vt_astro_faq_a{$i}", $faq['a'] );
		}
	}

}

/* ============================================================
   CREATION / MISE A JOUR DE LA PAGE
   ============================================================ */
function vt_ensure_app_page( $app_type, $slug_opt, $slug_default, $title_opt, $title_default ) {
	$slug  = get_option( $slug_opt, $slug_default );
	$title = get_option( $title_opt, $title_default );

	$existing = get_page_by_path( $slug, OBJECT, 'page' );

	if ( $existing ) {
		// Mettre a jour le titre si necessaire
		if ( $existing->post_title !== $title ) {
			wp_update_post( array(
				'ID'         => $existing->ID,
				'post_title' => $title,
			) );
		}
		// S'assurer que le contenu contient le shortcode
		if ( strpos( $existing->post_content, 'tirage_voyance' ) === false ) {
			wp_update_post( array(
				'ID'           => $existing->ID,
				'post_content' => '[tirage_voyance type="' . esc_attr( $app_type ) . '"]',
			) );
		}
		return $existing->ID;
	}

	// Creer la page
	$page_id = wp_insert_post( array(
		'post_title'     => $title,
		'post_name'      => $slug,
		'post_status'    => 'publish',
		'post_type'      => 'page',
		'post_content'   => '[tirage_voyance type="' . esc_attr( $app_type ) . '"]',
		'comment_status' => 'closed',
		'ping_status'    => 'closed',
	) );

	return $page_id;
}

