<?php
/**
 * Template — Compatibilite Astrologique
 * Shortcode: [tirage_voyance type="compatibilite-astrologique"]
 */
if ( ! defined( 'ABSPATH' ) ) exit;

$assets_url  = VT_PLUGIN_URL . 'assets/';
$proxy_url   = admin_url( 'admin-ajax.php?action=vt_ai_proxy' );
$email_proxy = admin_url( 'admin-ajax.php?action=vt_email_proxy' );

$counter_base   = get_option( 'vt_counter_base', 3800 );
$discount_pct   = get_option( 'vt_discount_pct', 30 );
$cta_enabled    = get_option( 'vt_cta_enabled', true );
$cta_hook       = get_option( 'vt_cta_hook', 'Votre duo astrologique vous intrigue ? Parlez a un expert' );
$cta_btn_text   = get_option( 'vt_cta_btn_text', 'Consulter un voyant specialiste en astrologie' );
$cta_url        = get_option( 'vt_cta_url', '#' );
$faq_enabled    = get_option( 'vt_faq_enabled', true );
$tts_enabled    = get_option( 'vt_tts_enabled', false );
$rate_enabled   = get_option( 'vt_rate_limit_enabled', false );
$rate_free      = get_option( 'vt_rate_free', 3 );
$rate_extended  = get_option( 'vt_rate_extended', 8 );
$default_theme  = get_option( 'vt_default_theme', 'light' );
$theme_toggle   = get_option( 'vt_theme_toggle', true );
$app_title      = get_option( 'vt_app_title', 'Compatibilite Astrologique' );
$app_desc       = get_option( 'vt_app_desc', "Decouvrez l'alchimie entre deux signes du zodiaque. Notre analyse celeste revele l'harmonie et les defis de votre duo astrologique." );
$app_btn_text   = get_option( 'vt_app_btn_text', 'Decouvrir ma compatibilite' );
$email_title    = get_option( 'vt_email_title', 'Obtenez -' . $discount_pct . '% sur votre consultation' );
$email_desc     = get_option( 'vt_email_desc', 'Recevez votre bon de reduction exclusif par email et parlez de votre couple avec un expert.' );
$email_btn      = get_option( 'vt_email_btn', 'Recevoir mon bon -' . $discount_pct . '%' );
$email_legal    = get_option( 'vt_email_legal', 'En soumettant votre email, vous acceptez de recevoir des communications de Hexagon Voyance. Desabonnement possible a tout moment.' );
$brand_name     = get_option( 'vt_brand_name', 'Hexagon Voyance' );
?>

<div class="vt-app" data-theme="<?php echo esc_attr( $default_theme ); ?>">

	<?php if ( $theme_toggle ) : ?>
	<button class="vt-theme-toggle" type="button" aria-label="Changer de theme">
		<svg class="vt-theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
		<svg class="vt-theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
	</button>
	<?php endif; ?>

	<div class="vt-stars-layer">
		<img src="<?php echo esc_url( $assets_url . 'textures/cosmic-gradient.svg' ); ?>" alt="" class="vt-stars-img" aria-hidden="true">
	</div>

	<div class="vt-particles" aria-hidden="true">
		<span class="vt-particle"></span><span class="vt-particle"></span>
		<span class="vt-particle"></span><span class="vt-particle"></span>
		<span class="vt-particle"></span><span class="vt-particle"></span>
		<span class="vt-particle"></span><span class="vt-particle"></span>
		<span class="vt-particle"></span><span class="vt-particle"></span>
		<span class="vt-particle"></span><span class="vt-particle"></span>
		<span class="vt-particle"></span><span class="vt-particle"></span>
		<span class="vt-particle"></span>
	</div>

	<!-- Sprite SVG signes du zodiaque -->
	<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
		<defs>
			<symbol id="sign-aries" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M7 8c0-2 1.5-3.5 3-3.5s2 1 2 2.5v6m0-6c0 0 0-2.5 2-2.5s3 1.5 3 3.5" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></symbol>
			<symbol id="sign-taurus" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M7 7c0 0-2-1-3 1s1 4 4 4h8c3 0 5-2 4-4s-3-1-3-1m-6 5v5m-3 0h6" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-gemini" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M8 4v16M16 4v16M8 4c0 0 2 2 4 2s4-2 4-2M8 20c0 0 2-2 4-2s4 2 4 2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-cancer" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M3 12c0-3 2-6 5-6s4 2 4 4-2 4-4 4-5-1-5-4zm18 0c0-3-2-6-5-6s-4 2-4 4 2 4 4 4 5-1 5-4z" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-leo" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M17 7c0-2-1.5-3.5-3.5-3.5S10 5 10 7v5c0 2.5-2 4.5-4.5 4.5S1 14.5 1 12m16-5c0 2.5 2 4.5 4.5 4.5S22 9.5 22 7s-2-4.5-4.5-4.5" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-virgo" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M5 4v16M12 4v10c0 3-2 6-5 6M12 4c0 0 3 1 4 4s0 7-4 10M19 4v16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-libra" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M4 16h16M4 12c0-4 3.5-7 8-7s8 3 8 7M2 20h20" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-scorpio" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M4 4v12c0 2 1 4 3 4s3-2 3-4V8m0 0c0-2 1-4 3-4s3 2 3 4v8c0 2 1 4 3 4s3-2 3-4v-3l-2 2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-sagittarius" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M4 20L20 4M20 4v6M20 4h-6M8 12l4 4" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-capricorn" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M4 20V8c0-3 2-5 5-5s4 2 4 5v6c0 2 1.5 4 4 4s4-2 4-4V4" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-aquarius" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-pisces" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" stroke-width="0.4"/><path d="M4 4c0 4 3 8 3 8s-3 4-3 8M20 4c0 4-3 8-3 8s3 4 3 8M4 12h16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></symbol>
		</defs>
	</svg>

	<div class="vt-container">

		<!-- ETAPE 0 : Introduction -->
		<div class="vt-step" data-step="intro">
			<div class="vt-astro-intro vt-anim-fade-in">
				<h1 class="vt-astro-intro-title"><?php echo esc_html( $app_title ); ?></h1>
				<div class="vt-astro-intro-line">
					<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
				</div>
				<p class="vt-astro-intro-desc"><?php echo esc_html( $app_desc ); ?></p>
				<div class="vt-counter">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
					<strong><span class="vt-counter-value">0</span></strong>
					<span>tirages ce mois</span>
				</div>
				<div style="margin-top: 2rem;">
					<button class="btn-hex" id="vt-btn-start">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z"/></svg>
						<?php echo esc_html( $app_btn_text ); ?>
					</button>
				</div>
				<p class="vt-rate-info"></p>
			</div>
		</div>

		<!-- ETAPE 1 : Selection des signes -->
		<div class="vt-step" data-step="form">
			<div class="vt-astro-intro vt-anim-fade-in">
				<h2 style="font-family:var(--theme-font-title); letter-spacing:0.05em; margin-bottom:0.5rem;">Choisissez vos signes</h2>
				<p style="color:var(--theme-text-muted); font-size:0.85rem; margin-bottom:2rem;">Selectionnez un signe dans chaque colonne</p>
			</div>

			<div id="vt-error" class="vt-error vt-hidden" style="margin-bottom:1rem;">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
				<p></p>
			</div>

			<div class="vt-astro-sign-group" data-group="1">
				<div class="vt-astro-sign-group-title">Premier signe</div>
				<div class="vt-astro-sign-grid">
					<button type="button" class="vt-astro-sign" data-sign="aries"><svg><use href="#sign-aries"/></svg><span class="vt-astro-sign-name">Belier</span></button>
					<button type="button" class="vt-astro-sign" data-sign="taurus"><svg><use href="#sign-taurus"/></svg><span class="vt-astro-sign-name">Taureau</span></button>
					<button type="button" class="vt-astro-sign" data-sign="gemini"><svg><use href="#sign-gemini"/></svg><span class="vt-astro-sign-name">Gemeaux</span></button>
					<button type="button" class="vt-astro-sign" data-sign="cancer"><svg><use href="#sign-cancer"/></svg><span class="vt-astro-sign-name">Cancer</span></button>
					<button type="button" class="vt-astro-sign" data-sign="leo"><svg><use href="#sign-leo"/></svg><span class="vt-astro-sign-name">Lion</span></button>
					<button type="button" class="vt-astro-sign" data-sign="virgo"><svg><use href="#sign-virgo"/></svg><span class="vt-astro-sign-name">Vierge</span></button>
					<button type="button" class="vt-astro-sign" data-sign="libra"><svg><use href="#sign-libra"/></svg><span class="vt-astro-sign-name">Balance</span></button>
					<button type="button" class="vt-astro-sign" data-sign="scorpio"><svg><use href="#sign-scorpio"/></svg><span class="vt-astro-sign-name">Scorpion</span></button>
					<button type="button" class="vt-astro-sign" data-sign="sagittarius"><svg><use href="#sign-sagittarius"/></svg><span class="vt-astro-sign-name">Sagittaire</span></button>
					<button type="button" class="vt-astro-sign" data-sign="capricorn"><svg><use href="#sign-capricorn"/></svg><span class="vt-astro-sign-name">Capricorne</span></button>
					<button type="button" class="vt-astro-sign" data-sign="aquarius"><svg><use href="#sign-aquarius"/></svg><span class="vt-astro-sign-name">Verseau</span></button>
					<button type="button" class="vt-astro-sign" data-sign="pisces"><svg><use href="#sign-pisces"/></svg><span class="vt-astro-sign-name">Poissons</span></button>
				</div>
			</div>

			<div class="vt-astro-divider"></div>

			<div class="vt-astro-sign-group" data-group="2">
				<div class="vt-astro-sign-group-title">Deuxieme signe</div>
				<div class="vt-astro-sign-grid">
					<button type="button" class="vt-astro-sign" data-sign="aries"><svg><use href="#sign-aries"/></svg><span class="vt-astro-sign-name">Belier</span></button>
					<button type="button" class="vt-astro-sign" data-sign="taurus"><svg><use href="#sign-taurus"/></svg><span class="vt-astro-sign-name">Taureau</span></button>
					<button type="button" class="vt-astro-sign" data-sign="gemini"><svg><use href="#sign-gemini"/></svg><span class="vt-astro-sign-name">Gemeaux</span></button>
					<button type="button" class="vt-astro-sign" data-sign="cancer"><svg><use href="#sign-cancer"/></svg><span class="vt-astro-sign-name">Cancer</span></button>
					<button type="button" class="vt-astro-sign" data-sign="leo"><svg><use href="#sign-leo"/></svg><span class="vt-astro-sign-name">Lion</span></button>
					<button type="button" class="vt-astro-sign" data-sign="virgo"><svg><use href="#sign-virgo"/></svg><span class="vt-astro-sign-name">Vierge</span></button>
					<button type="button" class="vt-astro-sign" data-sign="libra"><svg><use href="#sign-libra"/></svg><span class="vt-astro-sign-name">Balance</span></button>
					<button type="button" class="vt-astro-sign" data-sign="scorpio"><svg><use href="#sign-scorpio"/></svg><span class="vt-astro-sign-name">Scorpion</span></button>
					<button type="button" class="vt-astro-sign" data-sign="sagittarius"><svg><use href="#sign-sagittarius"/></svg><span class="vt-astro-sign-name">Sagittaire</span></button>
					<button type="button" class="vt-astro-sign" data-sign="capricorn"><svg><use href="#sign-capricorn"/></svg><span class="vt-astro-sign-name">Capricorne</span></button>
					<button type="button" class="vt-astro-sign" data-sign="aquarius"><svg><use href="#sign-aquarius"/></svg><span class="vt-astro-sign-name">Verseau</span></button>
					<button type="button" class="vt-astro-sign" data-sign="pisces"><svg><use href="#sign-pisces"/></svg><span class="vt-astro-sign-name">Poissons</span></button>
				</div>
			</div>

			<div style="text-align:center; margin-top:1.25rem;">
				<button type="button" class="btn-hex" id="vt-btn-tirage">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z"/></svg>
					Lancer le tirage
				</button>
			</div>
		</div>

		<!-- ETAPE 2 : Rituel -->
		<div class="vt-step" data-step="ritual">
			<div class="vt-astro-ritual">
				<div class="vt-astro-ritual-names">
					<span class="vt-astro-ritual-name"></span>
					<span class="vt-astro-ritual-link">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z"/></svg>
					</span>
					<span class="vt-astro-ritual-name"></span>
				</div>
				<div class="vt-astro-ritual-circle">
					<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
						<div class="vt-anim-dialotel-loader"></div>
					</div>
				</div>
				<p class="vt-astro-ritual-text">Les astres convergent...</p>
				<div class="vt-anim-dots"><span></span><span></span><span></span></div>
			</div>
		</div>

		<!-- ETAPE 3 : Resultat -->
		<div class="vt-step" data-step="result">
			<div class="vt-result" style="text-align:center;">

				<div class="vt-astro-result-score vt-anim-dialotel-reveal" id="vt-result-score">0%</div>
				<p class="vt-astro-result-score-label">de compatibilite astrologique</p>
				<div class="vt-astro-score-bar"><div class="vt-astro-score-bar-fill" style="width:0%"></div></div>

				<?php if ( $tts_enabled ) : ?>
				<div class="vt-tts-controls" style="margin-bottom:1.5rem;">
					<button class="vt-tts-btn" type="button" title="Lecture vocale">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
					</button>
				</div>
				<?php endif; ?>

				<div class="vt-astro-divider"></div>

				<div class="vt-astro-section">
					<h3 class="vt-astro-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Profil combine</h3>
					<p class="vt-astro-section-text" id="vt-result-profile"></p>
				</div>
				<div class="vt-astro-section">
					<h3 class="vt-astro-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>Traits partages</h3>
					<ul class="vt-astro-section-text" id="vt-result-traits"></ul>
				</div>
				<div class="vt-astro-section">
					<h3 class="vt-astro-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M9 18l6-6-6-6"/></svg>Conseils</h3>
					<p class="vt-astro-section-text" id="vt-result-advice"></p>
				</div>

				<div class="vt-astro-divider"></div>

				<!-- Email inline -->
				<div class="vt-email-inline" id="vt-email-inline">
					<h3><?php echo esc_html( $email_title ); ?></h3>
					<p><?php echo esc_html( $email_desc ); ?></p>
					<form class="vt-email-form" id="vt-email-form">
						<input type="email" id="vt-email-input" placeholder="Votre adresse email" required autocomplete="email">
						<button type="submit" class="btn-hex" style="width:100%;"><?php echo esc_html( $email_btn ); ?></button>
						<p class="vt-legal"><?php echo esc_html( $email_legal ); ?></p>
					</form>
					<div class="vt-email-success vt-hidden">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin:0 auto 0.25rem; display:block;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
						<p style="color:var(--theme-secondary); text-align:center;">Merci ! Votre bon de -<?php echo intval( $discount_pct ); ?>% a ete envoye.</p>
					</div>
				</div>

				<div class="vt-result-actions">
					<?php if ( $cta_enabled ) : ?>
					<div class="vt-cta-voyants" id="vt-cta-voyants">
						<p class="vt-cta-voyants-hook"><?php echo esc_html( $cta_hook ); ?></p>
						<a href="<?php echo esc_url( $cta_url ); ?>" class="btn-hex btn-hex--secondary" target="_blank" rel="noopener" onclick="VT.Analytics.track('vt_cta_voyants_clicked')">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
							<?php echo esc_html( $cta_btn_text ); ?>
						</a>
					</div>
					<?php endif; ?>
					<button class="btn-hex" id="vt-btn-restart">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
						Refaire un tirage
					</button>
				</div>
			</div>
		</div>

	</div>

	<!-- Modale limite -->
	<div class="vt-modal-overlay" id="vt-rate-limit-modal">
		<div class="vt-modal">
			<h3>Limite atteinte</h3>
			<p style="color:var(--theme-text-muted); margin:0.5rem 0 1.25rem; font-size:0.85rem;">Entrez votre email pour debloquer des tirages supplementaires.</p>
			<form class="vt-email-form" id="vt-extend-form">
				<input type="email" id="vt-extend-email" placeholder="Votre adresse email" required autocomplete="email">
				<button type="submit" class="btn-hex" style="width:100%;">Debloquer</button>
			</form>
		</div>
	</div>

</div>

<!-- Config -->
<script type="application/json" id="vt-config-compat-astro">
{
	"tirageId": "compat-astro",
	"theme": "<?php echo esc_js( $default_theme ); ?>",
	"counterBase": <?php echo intval( $counter_base ); ?>,
	"ai": { "proxyUrl": "<?php echo esc_url( $proxy_url ); ?>" },
	"tts": { "enabled": <?php echo $tts_enabled ? 'true' : 'false'; ?>, "autoplay": false },
	"rateLimit": { "enabled": <?php echo $rate_enabled ? 'true' : 'false'; ?>, "freePerDay": <?php echo intval( $rate_free ); ?>, "extendedPerDay": <?php echo intval( $rate_extended ); ?> },
	"emailCapture": { "enabled": true, "emailProxyUrl": "<?php echo esc_url( $email_proxy ); ?>", "provider": "proxy" },
	"ctaVoyants": { "enabled": <?php echo $cta_enabled ? 'true' : 'false'; ?>, "url": "<?php echo esc_url( $cta_url ); ?>" }
}
</script>

<script type="application/json" id="vt-i18n">
{ "app": { "loading": "Chargement...", "error": "Une erreur est survenue.", "retry": "Reessayer", "restart": "Refaire un tirage" }, "counter": { "label": "tirages effectues ce mois" }, "rateLimiter": { "remaining": "Il vous reste {count} tirage(s) aujourd'hui" }, "compatibility": { "title": "Compatibilite Astrologique" } }
</script>

<script type="application/json" id="vt-data-signs">
{
	"aries": { "name": "Belier", "element": "feu", "traits": ["courageux", "determine", "confiant", "enthousiaste"] },
	"taurus": { "name": "Taureau", "element": "terre", "traits": ["fiable", "patient", "pratique", "devoue"] },
	"gemini": { "name": "Gemeaux", "element": "air", "traits": ["adaptable", "curieux", "sociable", "spirituel"] },
	"cancer": { "name": "Cancer", "element": "eau", "traits": ["intuitif", "emotif", "protecteur", "tenace"] },
	"leo": { "name": "Lion", "element": "feu", "traits": ["creatifs", "passionnes", "generaux", "charismatiques"] },
	"virgo": { "name": "Vierge", "element": "terre", "traits": ["analytique", "travailleur", "perfectionniste", "fiable"] },
	"libra": { "name": "Balance", "element": "air", "traits": ["diplomate", "equilibre", "cooperatif", "juste"] },
	"scorpio": { "name": "Scorpion", "element": "eau", "traits": ["passionne", "determine", "intuitif", "mysterieux"] },
	"sagittarius": { "name": "Sagittaire", "element": "feu", "traits": ["optimiste", "aventurier", "philosophe", "libre"] },
	"capricorn": { "name": "Capricorne", "element": "terre", "traits": ["ambitieux", "discipline", "responsable", "patient"] },
	"aquarius": { "name": "Verseau", "element": "air", "traits": ["original", "independant", "humanitaire", "progressiste"] },
	"pisces": { "name": "Poissons", "element": "eau", "traits": ["compassionne", "intuitif", "artistique", "reveur"] }
}
</script>

<script type="text/plain" id="vt-prompt-compat-astro">
Tu es un astrologue expert. Redige une analyse de compatibilite astrologique en JSON uniquement :
{ "score": <1-100>, "profil": "<2-3 phrases sur le duo>", "traits": ["<trait1>", "<trait2>", "<trait3>"], "conseil": "<2-3 phrases>" }
Ton : bienveillant, poetique, precis. Texte en francais. Reponds UNIQUEMENT avec le JSON.
</script>
