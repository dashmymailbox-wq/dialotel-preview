<?php
/**
 * Shortcodes — [tirage_voyance type="x"]
 *
 * Injecte aussi du CSS inline pour cacher le titre de page et le chrome du theme.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'init', 'vt_register_shortcodes' );

function vt_register_shortcodes() {
	add_shortcode( 'tirage_voyance', 'vt_render_shortcode' );
}

function vt_render_shortcode( $atts ) {
	global $vt_shortcode_active;
	$vt_shortcode_active = true;

	$atts = shortcode_atts( array(
		'type' => 'compatibilite-amoureuse',
	), $atts, 'tirage_voyance' );

	$valid_types = array(
		'compatibilite-amoureuse',
		'compatibilite-astrologique',
		'tirage-tarot',
		'numerologie',
	);

	if ( ! in_array( $atts['type'], $valid_types, true ) ) {
		return '<p style="color:red;">Type de tirage invalide.</p>';
	}

	// Enqueue les assets
	vt_enqueue_tirage_assets( $atts['type'] );

	// Inline JS — theme + splash + rainHearts
	// Utilise wp_add_inline_script() pour eviter que WP encode && en &#038;&#038;
	$theme  = get_option( 'vt_default_theme', 'light' );
	$handle = 'vt-app-' . $atts['type'];
	$inline = "(function(){"
		. "if(!localStorage.getItem('vt_theme'))localStorage.setItem('vt_theme','" . esc_js( $theme ) . "');"
		. "var splash=document.getElementById('vt-splash'),container=document.querySelector('.vt-container');"
		. "if(!splash){if(container)container.classList.add('vt-ready')}"
		. "else{setTimeout(function(){splash.classList.add('vt-splash--hiding');setTimeout(function(){splash.remove();if(container)container.classList.add('vt-ready');window.scrollTo(0,0)},600)},2600)}"
		. "function rainHearts(){var s=['\\u2764','\\u2665','\\u2763'];for(var i=0;i<25;i++){var h=document.createElement('span');h.className='vt-heart-particle';h.textContent=s[i%3];h.style.left=(5+Math.random()*90)+'vw';h.style.top='-30px';h.style.fontSize=(12+Math.random()*16)+'px';h.style.animationDuration=(3+Math.random()*3)+'s';h.style.animationDelay=(0.1+Math.random()*1.8)+'s';document.body.appendChild(h);(function(el){setTimeout(function(){el.remove()},8000)})(h)}}"
		. "var rained=false;new MutationObserver(function(){if(!rained&&document.querySelector('.vt-step[data-step=\"result\"].vt-step--active')){rained=true;setTimeout(function(){var s=document.getElementById('vt-result-score');var pct=s?parseInt(s.textContent):0;if(pct>65)rainHearts()},1700)}}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['class']})"
		. "})();";
	wp_add_inline_script( $handle, $inline, 'after' );

	// Charger le template
	$template = VT_PLUGIN_DIR . 'templates/tirages/' . $atts['type'] . '.php';
	if ( ! file_exists( $template ) ) {
		return '<p style="color:red;">Template manquant.</p>';
	}

	ob_start();
	include $template;
	$html = ob_get_clean();

	// CSS inline — cacher le chrome WP + forcer le layout du plugin
	// Note : ce style est genere par PHP = jamais mis en cache navigateur
	$hide_css = '<style>
		/* Fond body blanc comme la preview */
		body { background: #ffffff !important; margin: 0 !important; }

		/* Cacher le titre de page (doublon avec le contenu du plugin) */
		body .entry-title,
		body .page-title,
		body h1.entry-title,
		body header.entry-header,
		body .site-header,
		body #masthead,
		body .widget-area,
		body .sidebar,
		body #secondary,
		body .wp-block-post-title {
			display: none !important;
		}
		/* Forcer les conteneurs parents a ne pas contraindre le plugin */
		body .site-content,
		body #primary,
		body #content,
		body main,
		body .entry-content,
		body .wp-block-post-content,
		body .is-layout-constrained,
		body .wp-block-group.is-layout-constrained {
			max-width: 100% !important;
			width: 100% !important;
			padding: 0 !important;
			margin: 0 !important;
			height: auto !important;
			overflow: visible !important;
		}
		/*
		 * FIX CRITIQUE — anneaux mandala centres sur le viewport.
		 *
		 * position:fixed est piege par transform/contain sur les ancestors WP.
		 * Quand piege, top:50% = 50% de la colonne WP (~600px), pas du viewport.
		 * Solution : vh/vw sont TOUJOURS relatifs au viewport, meme quand piege.
		 */
		.vt-app::before,
		.vt-app .vt-stars-layer,
		.vt-app .vt-particles,
		.vt-ring-bg {
			top: 50vh !important;
			left: 50vw !important;
		}
	</style>';

	return $hide_css . $html;
}
