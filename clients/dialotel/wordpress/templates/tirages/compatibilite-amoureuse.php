<?php
/**
 * Template — Compatibilite Amoureuse
 * Shortcode: [tirage_voyance type="compatibilite-amoureuse"]
 *
 * Les assets CSS/JS sont charges par enqueue.php via vt_enqueue_tirage_assets().
 * La config est injectee dynamiquement ci-dessous (pas de cle API dans le HTML).
 */
if ( ! defined( 'ABSPATH' ) ) exit;

$assets_url  = VT_PLUGIN_URL . 'assets/';
$proxy_url   = admin_url( 'admin-ajax.php?action=vt_ai_proxy' );
$email_proxy = admin_url( 'admin-ajax.php?action=vt_email_proxy' );

// Options dynamiques
$counter_base   = get_option( 'vt_counter_base', 4200 );
$discount_pct   = get_option( 'vt_discount_pct', 30 );
$cta_enabled    = get_option( 'vt_cta_enabled', true );
$cta_hook       = get_option( 'vt_cta_hook', 'Votre couple vous interroge ? Parlez a un expert' );
$cta_btn_text   = get_option( 'vt_cta_btn_text', 'Consulter un voyant specialiste en relations amoureuses' );
$cta_url        = get_option( 'vt_cta_url', '#' );
$faq_enabled    = get_option( 'vt_faq_enabled', true );
$tts_enabled    = get_option( 'vt_tts_enabled', false );
$rate_enabled   = get_option( 'vt_rate_limit_enabled', false );
$rate_free      = get_option( 'vt_rate_free', 3 );
$rate_extended  = get_option( 'vt_rate_extended', 8 );
$default_theme  = get_option( 'vt_default_theme', 'light' );
$theme_toggle   = get_option( 'vt_theme_toggle', true );
$app_title      = get_option( 'vt_app_title', 'Compatibilite Amoureuse' );
$app_desc       = get_option( 'vt_app_desc', 'Plongez dans les mysteres de l\'alchimie amoureuse. Notre analyse revele l\'harmonie profonde entre deux ames.' );
$app_btn_text   = get_option( 'vt_app_btn_text', 'Decouvrir ma compatibilite' );
$email_title    = get_option( 'vt_email_title', 'Obtenez -' . $discount_pct . '% sur votre consultation' );
$email_desc     = get_option( 'vt_email_desc', 'Recevez votre bon de reduction exclusif par email et parlez de votre couple avec un expert.' );
$email_btn      = get_option( 'vt_email_btn', 'Recevoir mon bon -' . $discount_pct . '%' );
$email_legal    = get_option( 'vt_email_legal', 'En soumettant votre email, vous acceptez de recevoir des communications de Hexagon Voyance. Desabonnement possible a tout moment.' );
$faq_title      = get_option( 'vt_faq_title', 'Compatibilite amoureuse — Questions frequentes' );
$brand_name     = get_option( 'vt_brand_name', 'Hexagon Voyance' );
?>

<div class="vt-app" data-theme="<?php echo esc_attr( $default_theme ); ?>">

	<?php if ( $theme_toggle ) : ?>
	<button class="vt-theme-toggle" type="button" aria-label="Changer de theme">
		<svg class="vt-theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
		<svg class="vt-theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
	</button>
	<?php endif; ?>

	<div class="vt-splash" id="vt-splash" aria-hidden="true">
		<?php
		$brand_logo = get_option( 'vt_brand_logo', '' );
		$logo_src   = ! empty( $brand_logo ) ? $brand_logo : $assets_url . 'logo-hexagon-voyance.webp';
		?>
		<img class="vt-splash-logo" src="<?php echo esc_url( $logo_src ); ?>" alt="<?php echo esc_attr( $brand_name ); ?>">
	</div>

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

	<!-- Sprite SVG pour les signes astrologiques -->
	<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
		<defs>
			<symbol id="sign-aries" viewBox="3 3 18 18"><path d="M7 8c0-2 1.5-3.5 3-3.5s2 1 2 2.5v6m0-6c0 0 0-2.5 2-2.5s3 1.5 3 3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></symbol>
			<symbol id="sign-taurus" viewBox="3 3 18 18"><path d="M7 7c0 0-2-1-3 1s1 4 4 4h8c3 0 5-2 4-4s-3-1-3-1m-6 5v5m-3 0h6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-gemini" viewBox="3 3 18 18"><path d="M8 4v16M16 4v16M8 4c0 0 2 2 4 2s4-2 4-2M8 20c0 0 2-2 4-2s4 2 4 2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-cancer" viewBox="3 3 18 18"><path d="M3 12c0-3 2-6 5-6s4 2 4 4-2 4-4 4-5-1-5-4zm18 0c0-3-2-6-5-6s-4 2-4 4 2 4 4 4 5-1 5-4z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-leo" viewBox="3 3 18 18"><path d="M17 7c0-2-1.5-3.5-3.5-3.5S10 5 10 7v5c0 2.5-2 4.5-4.5 4.5S1 14.5 1 12m16-5c0 2.5 2 4.5 4.5 4.5S22 9.5 22 7s-2-4.5-4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-virgo" viewBox="3 3 18 18"><path d="M5 4v16M12 4v10c0 3-2 6-5 6M12 4c0 0 3 1 4 4s0 7-4 10M19 4v16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-libra" viewBox="3 3 18 18"><path d="M4 16h16M4 12c0-4 3.5-7 8-7s8 3 8 7M2 20h20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-scorpio" viewBox="3 3 18 18"><path d="M4 4v12c0 2 1 4 3 4s3-2 3-4V8m0 0c0-2 1-4 3-4s3 2 3 4v8c0 2 1 4 3 4s3-2 3-4v-3l-2 2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-sagittarius" viewBox="3 3 18 18"><path d="M4 20L20 4M20 4v6M20 4h-6M8 12l4 4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-capricorn" viewBox="3 3 18 18"><path d="M4 20V8c0-3 2-5 5-5s4 2 4 5v6c0 2 1.5 4 4 4s4-2 4-4V4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-aquarius" viewBox="3 3 18 18"><path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
			<symbol id="sign-pisces" viewBox="3 3 18 18"><path d="M4 4c0 4 3 8 3 8s-3 4-3 8M20 4c0 4-3 8-3 8s3 4 3 8M4 12h16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
		</defs>
	</svg>

	<div class="vt-container">

		<!-- ETAPE 0 : Intro -->
		<div class="vt-step" data-step="intro">
			<div class="vt-am-intro vt-anim-fade-in">
				<h1 class="vt-am-intro-title"><?php echo esc_html( $app_title ); ?></h1>
				<div class="vt-am-intro-line">
					<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
				</div>
				<p class="vt-am-intro-desc"><?php echo esc_html( $app_desc ); ?></p>
				<div class="vt-counter">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
						<circle cx="9" cy="7" r="4"/>
						<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
						<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
					</svg>
					<strong><span class="vt-counter-value">0</span></strong>
					<span>tirages ce mois</span>
				</div>
				<div style="margin-top: 2rem;">
					<button class="btn-hex" id="vt-btn-start">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
							<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
						</svg>
						<?php echo esc_html( $app_btn_text ); ?>
					</button>
				</div>
				<p class="vt-rate-info"></p>
			</div>

			<?php if ( $faq_enabled ) : ?>
			<!-- FAQ SEO -->
			<section class="vt-faq" itemscope itemtype="https://schema.org/FAQPage">
				<h2 class="vt-faq-title"><?php echo esc_html( $faq_title ); ?></h2>
				<?php
				$faq_defaults = array(
					1 => array( 'q' => 'Comment fonctionne le calcul de compatibilite amoureuse ?', 'a' => 'Notre outil combine numerologie et astrologie pour calculer un score de compatibilite entre deux personnes. Il analyse les vibrations de vos prenoms et, si vous les renseignez, les affinites entre vos signes astrologiques.' ),
					2 => array( 'q' => 'Le score de compatibilite est-il fiable ?', 'a' => "Le score indique des affinites potentielles basees sur des traditions astrologiques milleniaires. Il constitue un outil de reflexion et d'exploration, pas une garantie. Seule la rencontre humaine cree une vraie relation." ),
					3 => array( 'q' => 'Que signifie un score eleve ?', 'a' => 'Un score eleve suggere une harmonie naturelle et des affinites energetiques fortes entre les deux personnes. Cela favorise la comprehension mutuelle, mais chaque couple reste unique.' ),
					4 => array( 'q' => 'Puis-je faire plusieurs tirages gratuits ?', 'a' => 'Oui, plusieurs tirages gratuits sont disponibles chaque jour. Pour un accompagnement personnalise et approfondi, nos voyants specialistes en relations amoureuses sont disponibles 24h/24.' ),
					5 => array( 'q' => "Faut-il connaitre la date de naissance pour utiliser l'outil ?", 'a' => 'Non, les prenoms suffisent pour obtenir un premier tirage. Ajouter les dates de naissance et signes astrologiques permet une analyse plus precise et personnalisee de votre compatibilite.' ),
				);
				for ( $i = 1; $i <= 5; $i++ ) :
					$q = get_option( "vt_faq_q{$i}" ) ?: $faq_defaults[ $i ]['q'];
					$a = get_option( "vt_faq_a{$i}" ) ?: $faq_defaults[ $i ]['a'];
					if ( empty( $q ) ) continue;
				?>
				<details class="vt-faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="vt-faq-q" itemprop="name"><?php echo esc_html( $q ); ?></summary>
					<p class="vt-faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer"><span itemprop="text"><?php echo esc_html( $a ); ?></span></p>
				</details>
				<?php endfor; ?>
			</section>
			<?php endif; ?>
		</div>

		<!-- ETAPE 1 : Formulaire -->
		<div class="vt-step" data-step="form">
			<div class="vt-am-intro vt-anim-fade-in">
				<h2 style="font-family:var(--theme-font-title); letter-spacing:0.05em; margin-bottom:0.25rem; font-size:1.4rem;">Entrez vos informations</h2>
				<p style="color:var(--theme-text-muted); font-size:0.82rem; margin-bottom:0.75rem;">Deux prenoms, un destin</p>
			</div>
			<div id="vt-error" class="vt-error vt-hidden" style="margin-bottom:0.75rem;">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
					<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
				</svg>
				<p></p>
			</div>
			<form class="vt-am-form" id="vt-am-form" onsubmit="return false;">
				<div class="vt-am-form-persons">
					<div class="vt-am-person">
						<div class="vt-am-person-header">Premiere personne</div>
						<div class="vt-am-field-group">
							<label for="vt-name1">Prenom</label>
							<input type="text" id="vt-name1" placeholder="Ex : Marie" required autocomplete="given-name">
						</div>
						<div class="vt-am-field-group">
							<label for="vt-birth1">Date de naissance (optionnel)</label>
							<input type="date" id="vt-birth1" autocomplete="bday" value="2000-01-01">
						</div>
					</div>
					<div class="vt-am-form-heart" aria-hidden="true">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
					</div>
					<div class="vt-am-person">
						<div class="vt-am-person-header">Deuxieme personne</div>
						<div class="vt-am-field-group">
							<label for="vt-name2">Prenom</label>
							<input type="text" id="vt-name2" placeholder="Ex : Pierre" required autocomplete="given-name">
						</div>
						<div class="vt-am-field-group">
							<label for="vt-birth2">Date de naissance (optionnel)</label>
							<input type="date" id="vt-birth2" autocomplete="bday" value="2000-01-01">
						</div>
					</div>
				</div>
				<div style="text-align:center; margin-top:1rem;">
					<button type="button" class="btn-hex" id="vt-btn-tirage">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
							<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
						</svg>
						Lancer le tirage
					</button>
				</div>
			</form>
		</div>

		<!-- ETAPE 2 : Rituel -->
		<div class="vt-step" data-step="ritual">
			<div class="vt-am-ritual">
				<div class="vt-am-ritual-names">
					<div class="vt-am-ritual-person">
						<span class="vt-am-ritual-name"></span>
						<div class="vt-am-ritual-sign" id="vt-ritual-sign1"></div>
					</div>
					<span class="vt-am-ritual-heart">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
							<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
						</svg>
					</span>
					<div class="vt-am-ritual-person">
						<span class="vt-am-ritual-name"></span>
						<div class="vt-am-ritual-sign" id="vt-ritual-sign2"></div>
					</div>
				</div>
				<div class="vt-am-ritual-circle">
					<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
						<div class="vt-anim-dialotel-loader"></div>
					</div>
				</div>
				<p class="vt-am-ritual-text">Les astres convergent...</p>
				<div class="vt-anim-dots"><span></span><span></span><span></span></div>
			</div>
		</div>

		<!-- ETAPE 3 : Resultat -->
		<div class="vt-step" data-step="result">
			<div class="vt-result">
				<?php if ( $tts_enabled ) : ?>
				<div class="vt-tts-controls">
					<button class="vt-tts-btn" type="button" title="Lecture vocale">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
							<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
							<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
							<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
						</svg>
					</button>
				</div>
				<?php endif; ?>

				<div class="vt-result-header" id="vt-result-header"></div>
				<div class="vt-am-result-score vt-anim-dialotel-reveal" id="vt-result-score">0%</div>
				<p class="vt-am-result-score-label">de compatibilite amoureuse</p>
				<div class="vt-am-score-bar">
					<div class="vt-am-score-bar-fill" style="width:0%"></div>
				</div>
				<div class="vt-am-divider"></div>

				<div class="vt-am-section">
					<h3 class="vt-am-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Resume</h3>
					<p class="vt-am-section-text" id="vt-result-resume"></p>
				</div>
				<div class="vt-am-section">
					<h3 class="vt-am-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>Points forts</h3>
					<ul class="vt-am-section-text" id="vt-result-strengths"></ul>
				</div>
				<div class="vt-am-section">
					<h3 class="vt-am-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Points de tension</h3>
					<ul class="vt-am-section-text" id="vt-result-tensions"></ul>
				</div>
				<div class="vt-am-section">
					<h3 class="vt-am-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M9 18l6-6-6-6"/></svg>Conseil</h3>
					<p class="vt-am-section-text" id="vt-result-advice"></p>
				</div>
				<div class="vt-am-divider"></div>

				<!-- Partage social -->
				<?php $share_enabled = get_option( 'vt_share_enabled', true ); ?>
				<?php if ( $share_enabled ) : ?>
				<div class="vt-share" id="vt-share">
					<p class="vt-share-title">Partager le resultat</p>
					<button class="vt-share-trigger" id="vt-btn-share" type="button">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
						Partager mon score
					</button>
					<div class="vt-share-buttons">
						<?php if ( get_option( 'vt_share_facebook', true ) ) : ?>
						<button class="vt-share-btn" data-platform="facebook" title="Facebook">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
						</button>
						<?php endif; ?>
						<?php if ( get_option( 'vt_share_whatsapp', true ) ) : ?>
						<button class="vt-share-btn" data-platform="whatsapp" title="WhatsApp">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.479-8.449z"/></svg>
						</button>
						<?php endif; ?>
						<?php if ( get_option( 'vt_share_tiktok', true ) ) : ?>
						<button class="vt-share-btn" data-platform="tiktok" title="TikTok">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.16z"/></svg>
						</button>
						<?php endif; ?>
						<?php if ( get_option( 'vt_share_instagram', true ) ) : ?>
						<button class="vt-share-btn" data-platform="instagram" title="Instagram">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
						</button>
						<?php endif; ?>
						<?php if ( get_option( 'vt_share_snapchat', true ) ) : ?>
						<button class="vt-share-btn" data-platform="snapchat" title="Snapchat">
							<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.922-.214.14-.05.26-.09.36-.09.18 0 .33.09.39.24.09.18.03.39-.12.51-.39.27-.96.48-1.47.63-.3.09-.6.18-.81.27-.6.3-.75.96-.87 1.47-.03.12-.06.24-.09.33-.03.09-.06.15-.12.18-.06.03-.15.06-.27.06-.3 0-.69-.12-1.11-.27-.39-.12-.81-.27-1.26-.33-.18-.03-.36-.03-.54-.03-.36 0-.72.06-1.05.15-.51.15-.96.45-1.41.72-.54.33-1.11.69-1.83.69-.06 0-.12 0-.18-.03-.78-.09-1.35-.6-1.89-1.11-.36-.33-.72-.66-1.14-.87-.3-.15-.63-.21-.96-.27-.33-.06-.66-.12-.96-.27-.48-.21-.81-.63-.81-1.11 0-.45.21-.87.57-1.14.27-.21.6-.33.93-.33.03 0 .06 0 .09.03.15 0 .3.06.42.12.12.06.24.15.36.21.12.06.24.12.36.12.09 0 .15-.03.21-.06.27-.15.39-.63.51-1.14.15-.54.33-1.2.81-1.59.39-.3.87-.42 1.29-.51.21-.06.42-.09.6-.15.15-.06.27-.12.33-.24.06-.12.06-.27.06-.42 0-.15-.03-.33-.03-.51-.03-.51-.06-1.14.21-1.68.21-.42.57-.69.96-.87.78-.36 1.68-.39 2.04-.39z"/></svg>
						</button>
						<?php endif; ?>
					</div>
					<div class="vt-share-toast" id="vt-share-toast">Lien copie !</div>
				</div>
				<?php endif; ?>

				<!-- Email inline — bon de reduction -->
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
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
								<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
							</svg>
							<?php echo esc_html( $cta_btn_text ); ?>
						</a>
					</div>
					<?php endif; ?>
					<button class="btn-hex" id="vt-btn-restart">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
							<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
						</svg>
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

	<!-- Modale partage -->
	<div class="vt-modal-overlay" id="vt-share-modal">
		<div class="vt-modal vt-share-modal">
			<button class="vt-modal-close" onclick="this.closest('.vt-modal-overlay').style.display='none'" aria-label="Fermer">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
			<h3>Votre image de compatibilite</h3>
			<img id="vt-share-preview" alt="Apercu du tirage" style="max-width:100%;border-radius:10px;margin:1rem 0;">
			<div class="vt-share-modal-actions">
				<a id="vt-share-download" download="compatibilite-amoureuse.png" class="btn-hex">Telecharger l'image</a>
				<button id="vt-share-copy-link" class="btn-hex btn-hex--secondary" type="button">Copier le lien</button>
			</div>
			<p class="vt-share-assist-text" id="vt-share-assist-text" style="display:none;"></p>
		</div>
	</div>

</div>

<!-- Config — injectee dynamiquement par PHP -->
<script type="application/json" id="vt-config-compat-amour">
{
	"tirageId": "compat-amour",
	"theme": "<?php echo esc_js( $default_theme ); ?>",
	"counterBase": <?php echo intval( $counter_base ); ?>,
	"ai": { "proxyUrl": "<?php echo esc_url( $proxy_url ); ?>" },
	"tts": { "enabled": <?php echo $tts_enabled ? 'true' : 'false'; ?>, "autoplay": false },
	"rateLimit": { "enabled": <?php echo $rate_enabled ? 'true' : 'false'; ?>, "freePerDay": <?php echo intval( $rate_free ); ?>, "extendedPerDay": <?php echo intval( $rate_extended ); ?> },
	"emailCapture": { "enabled": true, "emailProxyUrl": "<?php echo esc_url( $email_proxy ); ?>", "provider": "proxy" },
	"logoUrl": "<?php echo esc_url( $logo_src ); ?>",
	"ctaVoyants": { "enabled": <?php echo $cta_enabled ? 'true' : 'false'; ?>, "url": "<?php echo esc_url( $cta_url ); ?>" }
}
</script>

<script type="application/json" id="vt-i18n">
{ "app": { "loading": "Chargement...", "error": "Une erreur est survenue.", "retry": "Reessayer", "restart": "Refaire un tirage" }, "counter": { "label": "tirages effectues ce mois" }, "rateLimiter": { "remaining": "Il vous reste {count} tirage(s) aujourd'hui" } }
</script>

<script type="text/plain" id="vt-prompt-compat-amour">
Tu es un astrologue et expert en compatibilite amoureuse. Redige une analyse de compatibilite en JSON uniquement :
{ "score": <1-100>, "resume": "<2-3 phrases>", "pointsFort": ["<1>", "<2>", "<3>"], "tensions": ["<1>", "<2>"], "conseil": "<2-3 phrases>" }
Ton : bienveillant, positif, encourageant. Texte en francais. Reponds UNIQUEMENT avec le JSON.
</script>

<!-- Anneaux mandala au niveau <body> — échappent aux ancêtres WP qui piègent position:fixed -->
<script>
(function(){
  if(document.querySelector('.vt-ring-bg'))return;
  [1,2,3].forEach(function(i){
    var d=document.createElement('div');
    d.setAttribute('aria-hidden','true');
    d.className='vt-ring-bg vt-ring-bg--'+i;
    document.body.insertBefore(d,document.body.firstChild);
  });
})();
</script>

<!-- JS enqueues + inline scripts added by shortcodes.php via wp_add_inline_script() -->
