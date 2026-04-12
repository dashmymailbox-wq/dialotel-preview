<?php
/**
 * Template — Numerologie
 * Shortcode: [tirage_voyance type="numerologie"]
 */
if ( ! defined( 'ABSPATH' ) ) exit;

$assets_url  = VT_PLUGIN_URL . 'assets/';
$proxy_url   = admin_url( 'admin-ajax.php?action=vt_ai_proxy' );
$email_proxy = admin_url( 'admin-ajax.php?action=vt_email_proxy' );

$counter_base   = get_option( 'vt_counter_base', 3000 );
$discount_pct   = get_option( 'vt_discount_pct', 30 );
$cta_enabled    = get_option( 'vt_cta_enabled', true );
$cta_hook       = get_option( 'vt_cta_hook', 'Votre chemin de vie vous interpelle ? Parlez a un expert.' );
$cta_btn_text   = get_option( 'vt_cta_btn_text', 'Consulter un voyant specialiste en numerologie' );
$cta_url        = get_option( 'vt_cta_url', '#' );
$tts_enabled    = get_option( 'vt_tts_enabled', false );
$rate_enabled   = get_option( 'vt_rate_limit_enabled', false );
$rate_free      = get_option( 'vt_rate_free', 3 );
$rate_extended  = get_option( 'vt_rate_extended', 8 );
$default_theme  = get_option( 'vt_default_theme', 'light' );
$theme_toggle   = get_option( 'vt_theme_toggle', true );
$app_title      = get_option( 'vt_app_title', 'Numerologie' );
$app_desc       = get_option( 'vt_app_desc', "Decouvrez votre chemin de vie a travers la magie des nombres. Votre prenom et votre date de naissance recelent un chiffre unique qui guide votre destinee." );
$app_btn_text   = get_option( 'vt_app_btn_text', 'Decouvrir mon chiffre' );
$email_title    = get_option( 'vt_email_title', 'Obtenez -' . $discount_pct . '% sur votre consultation' );
$email_desc     = get_option( 'vt_email_desc', 'Recevez votre bon de reduction exclusif par email.' );
$email_btn      = get_option( 'vt_email_btn', 'Recevoir mon bon -' . $discount_pct . '%' );
$email_legal    = get_option( 'vt_email_legal', 'En soumettant votre email, vous acceptez de recevoir des communications de Hexagon Voyance. Desabonnement possible a tout moment.' );
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

	<div class="vt-container">

		<!-- ETAPE 0 : Introduction -->
		<div class="vt-step" data-step="intro">
			<div class="vt-numero-intro vt-anim-fade-in">
				<h1 class="vt-numero-intro-title"><?php echo esc_html( $app_title ); ?></h1>
				<div class="vt-numero-intro-line">
					<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
				</div>
				<p class="vt-numero-intro-desc"><?php echo esc_html( $app_desc ); ?></p>
				<div class="vt-counter">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
					<strong><span class="vt-counter-value">0</span></strong>
					<span>tirages ce mois</span>
				</div>
				<div style="margin-top: 2rem;">
					<button class="btn-hex" id="vt-btn-start">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
						<?php echo esc_html( $app_btn_text ); ?>
					</button>
				</div>
				<p class="vt-rate-info"></p>
			</div>
		</div>

		<!-- ETAPE 1 : Formulaire -->
		<div class="vt-step" data-step="form">
			<div class="vt-numero-intro vt-anim-fade-in">
				<h2 style="font-family:var(--theme-font-title); letter-spacing:0.05em; margin-bottom:0.5rem;">Vos informations</h2>
				<p style="color:var(--theme-text-muted); font-size:0.85rem; margin-bottom:2rem;">Votre prenom et date de naissance pour calculer votre chemin de vie</p>
			</div>

			<div id="vt-error" class="vt-error vt-hidden" style="margin-bottom:1rem;">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
				<p></p>
			</div>

			<form class="vt-numero-form" id="vt-numero-form" onsubmit="return false;">
				<div class="vt-numero-field-group">
					<label for="vt-fullname">Prenom complet</label>
					<input type="text" id="vt-fullname" placeholder="Ex : Marie Dupont" required autocomplete="name">
				</div>
				<div class="vt-numero-field-group">
					<label for="vt-birthdate">Date de naissance</label>
					<input type="date" id="vt-birthdate" required autocomplete="bday" value="2000-01-01">
				</div>
				<div style="text-align:center; margin-top:1.25rem;">
					<button type="button" class="btn-hex" id="vt-btn-tirage">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
						Calculer mon chemin de vie
					</button>
				</div>
			</form>
		</div>

		<!-- ETAPE 2 : Rituel -->
		<div class="vt-step" data-step="ritual">
			<div class="vt-numero-ritual">
				<p class="vt-numero-ritual-text">Votre nombre se revele...</p>
				<div class="vt-numero-ritual-number" id="vt-numero-ritual-number">?</div>
				<div class="vt-anim-dots"><span></span><span></span><span></span></div>
			</div>
		</div>

		<!-- ETAPE 3 : Resultat -->
		<div class="vt-step" data-step="result">
			<div style="text-align:center;">

				<div class="vt-numero-result-number vt-anim-dialotel-reveal" id="vt-result-number">0</div>
				<p class="vt-numero-result-label">Votre chemin de vie</p>

				<?php if ( $tts_enabled ) : ?>
				<div class="vt-tts-controls" style="margin-bottom:1.5rem;">
					<button class="vt-tts-btn" type="button" title="Lecture vocale">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
					</button>
				</div>
				<?php endif; ?>

				<div class="vt-numero-divider"></div>

				<div class="vt-numero-section">
					<h3 class="vt-numero-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Votre profil numerologique</h3>
					<p class="vt-numero-section-text" id="vt-result-description"></p>
				</div>
				<div class="vt-numero-section">
					<h3 class="vt-numero-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>Vos forces</h3>
					<ul class="vt-numero-section-text" id="vt-result-forces"></ul>
				</div>
				<div class="vt-numero-section">
					<h3 class="vt-numero-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Vos defis</h3>
					<ul class="vt-numero-section-text" id="vt-result-defis"></ul>
				</div>
				<div class="vt-numero-section">
					<h3 class="vt-numero-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M9 18l6-6-6-6"/></svg>Conseil</h3>
					<p class="vt-numero-section-text" id="vt-result-advice"></p>
				</div>

				<div class="vt-numero-divider"></div>

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
						Refaire un calcul
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
<script type="application/json" id="vt-config-numero">
{
	"tirageId": "numerologie",
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
{ "app": { "loading": "Chargement...", "error": "Une erreur est survenue.", "retry": "Reessayer", "restart": "Refaire un calcul" }, "counter": { "label": "tirages effectues ce mois" }, "rateLimiter": { "remaining": "Il vous reste {count} tirage(s) aujourd'hui" } }
</script>

<script type="text/plain" id="vt-prompt-numero">
Tu es un numerologue expert. Prenom : "{prenom}", date de naissance : "{date}", chiffre de vie : {chiffre}. Redige une analyse en JSON uniquement :
{ "description": "<3-4 phrases sur le profil>", "forces": ["<force1>", "<force2>", "<force3>"], "defis": ["<defi1>", "<defi2>"], "conseil": "<2-3 phrases>" }
Ton : bienveillant, precis, encourageant. Texte en francais. Reponds UNIQUEMENT avec le JSON.
</script>
