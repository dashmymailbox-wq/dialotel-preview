<?php
/**
 * Admin — Page de reglages du plugin Voyance Tirages.
 *
 * 5 onglets : Page & SEO | Branding | App | APIs | Avance
 * Design moderne, toggle switches, radio cards, password fields.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ============================================================
   HOOKS
   ============================================================ */
add_action( 'admin_menu', 'vt_register_admin_page' );
add_action( 'admin_init', 'vt_register_settings' );
add_action( 'wp_ajax_vt_test_api_key', 'vt_ajax_test_api_key' );

/* ============================================================
   AJAX — Test de cle API
   ============================================================ */
function vt_ajax_test_api_key() {
	check_ajax_referer( 'vt_admin_nonce', 'nonce' );
	if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'message' => 'Accès refusé.' ) );

	$provider = isset( $_POST['provider'] ) ? sanitize_text_field( $_POST['provider'] ) : '';
	$key      = isset( $_POST['key'] )      ? sanitize_text_field( $_POST['key'] )      : '';

	if ( ! $key ) {
		wp_send_json_error( array( 'message' => 'Clé vide — saisissez une clé avant de tester.' ) );
	}

	$result = array( 'ok' => false, 'message' => '' );

	switch ( $provider ) {

		case 'mistral':
			$resp = wp_remote_get( 'https://api.mistral.ai/v1/models', array(
				'headers' => array( 'Authorization' => 'Bearer ' . $key ),
				'timeout' => 10,
			));
			if ( is_wp_error( $resp ) ) {
				$result['message'] = 'Erreur réseau : ' . $resp->get_error_message();
			} elseif ( wp_remote_retrieve_response_code( $resp ) === 200 ) {
				$result['ok']      = true;
				$result['message'] = 'Clé valide — connexion Mistral réussie.';
			} else {
				$body = json_decode( wp_remote_retrieve_body( $resp ), true );
				$result['message'] = 'Clé invalide (' . wp_remote_retrieve_response_code( $resp ) . ') : ' . ( isset( $body['message'] ) ? $body['message'] : 'Erreur inconnue.' );
			}
			break;

		case 'openai':
			$resp = wp_remote_get( 'https://api.openai.com/v1/models', array(
				'headers' => array( 'Authorization' => 'Bearer ' . $key ),
				'timeout' => 10,
			));
			if ( is_wp_error( $resp ) ) {
				$result['message'] = 'Erreur réseau : ' . $resp->get_error_message();
			} elseif ( wp_remote_retrieve_response_code( $resp ) === 200 ) {
				$result['ok']      = true;
				$result['message'] = 'Clé valide — connexion OpenAI réussie.';
			} else {
				$body = json_decode( wp_remote_retrieve_body( $resp ), true );
				$result['message'] = 'Clé invalide (' . wp_remote_retrieve_response_code( $resp ) . ') : ' . ( isset( $body['error']['message'] ) ? $body['error']['message'] : 'Erreur inconnue.' );
			}
			break;

		case 'claude':
			$resp = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
				'headers' => array(
					'x-api-key'         => $key,
					'anthropic-version' => '2023-06-01',
					'content-type'      => 'application/json',
				),
				'body'    => wp_json_encode( array(
					'model'      => 'claude-haiku-4-5-20251001',
					'max_tokens' => 1,
					'messages'   => array( array( 'role' => 'user', 'content' => 'Hi' ) ),
				)),
				'timeout' => 15,
			));
			if ( is_wp_error( $resp ) ) {
				$result['message'] = 'Erreur réseau : ' . $resp->get_error_message();
			} elseif ( in_array( wp_remote_retrieve_response_code( $resp ), array( 200, 201 ), true ) ) {
				$result['ok']      = true;
				$result['message'] = 'Clé valide — connexion Claude réussie.';
			} else {
				$body = json_decode( wp_remote_retrieve_body( $resp ), true );
				$result['message'] = 'Clé invalide (' . wp_remote_retrieve_response_code( $resp ) . ') : ' . ( isset( $body['error']['message'] ) ? $body['error']['message'] : 'Erreur inconnue.' );
			}
			break;

		case 'brevo':
			$resp = wp_remote_get( 'https://api.brevo.com/v3/account', array(
				'headers' => array( 'api-key' => $key ),
				'timeout' => 10,
			));
			if ( is_wp_error( $resp ) ) {
				$result['message'] = 'Erreur réseau : ' . $resp->get_error_message();
			} elseif ( wp_remote_retrieve_response_code( $resp ) === 200 ) {
				$body = json_decode( wp_remote_retrieve_body( $resp ), true );
				$result['ok']      = true;
				$result['message'] = 'Clé valide — compte : ' . ( isset( $body['email'] ) ? esc_html( $body['email'] ) : 'OK' );
			} else {
				$body = json_decode( wp_remote_retrieve_body( $resp ), true );
				$result['message'] = 'Clé invalide (' . wp_remote_retrieve_response_code( $resp ) . ') : ' . ( isset( $body['message'] ) ? $body['message'] : 'Erreur inconnue.' );
			}
			break;

		default:
			$result['message'] = 'Provider inconnu.';
	}

	if ( $result['ok'] ) {
		wp_send_json_success( $result );
	} else {
		wp_send_json_error( $result );
	}
}

/* ============================================================
   MENU — Top-level (pas sous Reglages)
   ============================================================ */
function vt_register_admin_page() {
	add_menu_page(
		'Voyance Tirages',
		'Voyance Tirages',
		'manage_options',
		'voyance-tirages',
		'vt_render_admin_page',
		'data:image/svg+xml;base64,' . base64_encode( '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ed8ce6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' ),
		80
	);
}

/* ============================================================
   REGISTER SETTINGS
   ============================================================ */
function vt_register_settings() {
	$settings = array(
		// Page & SEO
		'vt_page_slug', 'vt_page_title', 'vt_meta_title', 'vt_meta_desc',
		// Branding
		'vt_brand_name', 'vt_brand_logo', 'vt_brand_favicon',
		// App — Compat. Amoureuse
		'vt_app_title', 'vt_app_desc', 'vt_app_btn_text', 'vt_counter_base',
		'vt_discount_pct', 'vt_email_title', 'vt_email_desc', 'vt_email_btn', 'vt_email_legal',
		'vt_cta_enabled', 'vt_cta_hook', 'vt_cta_btn_text', 'vt_cta_url',
		'vt_faq_enabled', 'vt_faq_title',
		'vt_share_enabled', 'vt_share_facebook', 'vt_share_whatsapp', 'vt_share_tiktok', 'vt_share_instagram', 'vt_share_snapchat',
		// App — Toggles
		'vt_app_amoureuse_enabled', 'vt_app_astro_enabled',
		// App — Compat. Astrologique
		'vt_astro_app_title', 'vt_astro_app_desc', 'vt_astro_app_btn_text', 'vt_astro_counter_base',
		'vt_astro_discount_pct', 'vt_astro_email_title', 'vt_astro_email_desc', 'vt_astro_email_btn', 'vt_astro_email_legal',
		'vt_astro_cta_enabled', 'vt_astro_cta_hook', 'vt_astro_cta_btn_text', 'vt_astro_cta_url',
		'vt_astro_faq_enabled', 'vt_astro_faq_title',
		'vt_astro_share_enabled', 'vt_astro_default_theme',
		// Page & SEO — Compat. Astrologique
		'vt_astro_page_title', 'vt_astro_page_slug', 'vt_astro_meta_title', 'vt_astro_meta_desc',
		// APIs
		'vt_ai_provider',
		'vt_ai_mistral_key', 'vt_ai_mistral_model',
		'vt_ai_openai_key', 'vt_ai_openai_model',
		'vt_ai_claude_key', 'vt_ai_claude_model',
		'vt_brevo_key', 'vt_brevo_list_id',
		// Avance
		'vt_tts_enabled', 'vt_rate_limit_enabled', 'vt_rate_free', 'vt_rate_extended',
		'vt_default_theme', 'vt_theme_toggle',
	);

	// Checkboxes — gerer "unchecked" (absent du POST = 0)
	$checkboxes = array(
		'vt_app_amoureuse_enabled', 'vt_app_astro_enabled',
		'vt_cta_enabled', 'vt_faq_enabled', 'vt_share_enabled',
		'vt_share_facebook', 'vt_share_whatsapp', 'vt_share_tiktok', 'vt_share_instagram', 'vt_share_snapchat',
		'vt_astro_cta_enabled', 'vt_astro_faq_enabled', 'vt_astro_share_enabled',
		'vt_tts_enabled', 'vt_rate_limit_enabled', 'vt_theme_toggle',
	);

	foreach ( $settings as $setting ) {
		$args = array();
		if ( in_array( $setting, $checkboxes, true ) ) {
			$args['sanitize_callback'] = function( $value ) {
				return $value ? '1' : '0';
			};
		}
		// CTA URL optionnel si CTA désactivé
		if ( $setting === 'vt_cta_url' && ! get_option( 'vt_cta_enabled', false ) ) {
			$args['sanitize_callback'] = function( $value ) { return '#'; };
		}
		if ( $setting === 'vt_astro_cta_url' && ! get_option( 'vt_astro_cta_enabled', false ) ) {
			$args['sanitize_callback'] = function( $value ) { return '#'; };
		}
		register_setting( 'vt_settings_group', $setting, $args );
	}

	// FAQ Q/R — Compat. Amoureuse
	for ( $i = 1; $i <= 5; $i++ ) {
		register_setting( 'vt_settings_group', "vt_faq_q{$i}" );
		register_setting( 'vt_settings_group', "vt_faq_a{$i}" );
	}

	// FAQ Q/R — Compat. Astrologique
	for ( $i = 1; $i <= 5; $i++ ) {
		register_setting( 'vt_settings_group', "vt_astro_faq_q{$i}" );
		register_setting( 'vt_settings_group', "vt_astro_faq_a{$i}" );
	}
}

/* ============================================================
   SAUVEGARDE + CREATION PAGE
   ============================================================ */

// Apres sauvegarde reglages → mettre a jour les pages
add_action( 'admin_init', function() {
	if ( isset( $_GET['page'] ) && $_GET['page'] === 'voyance-tirages' && isset( $_GET['settings-updated'] ) && $_GET['settings-updated'] === 'true' ) {
		// Compat. Amoureuse
		if ( get_option( 'vt_app_amoureuse_enabled', '0' ) === '1' ) {
			vt_ensure_app_page( 'compatibilite-amoureuse', 'vt_page_slug', 'tirage-compatibilite-amoureuse', 'vt_page_title', 'Compatibilite Amoureuse' );
		}
		// Compat. Astrologique
		if ( get_option( 'vt_app_astro_enabled', '0' ) === '1' ) {
			vt_ensure_app_page( 'compatibilite-astrologique', 'vt_astro_page_slug', 'tirage-compatibilite-astrologique', 'vt_astro_page_title', 'Compatibilite Astrologique' );
		}
	}
});

// Bouton manuel "Creer la page"
add_action( 'admin_init', function() {
	if ( isset( $_GET['vt_create_page'] ) && isset( $_GET['_wpnonce'] ) && wp_verify_nonce( $_GET['_wpnonce'], 'vt_create_page' ) ) {
		$page_id = vt_ensure_page_exists();
		$redirect = admin_url( 'admin.php?page=voyance-tirages&tab=applications&vt_page_created=' . ( $page_id ? '1' : '0' ) );
		wp_safe_redirect( $redirect );
		exit;
	}
});

// Notifications admin
add_action( 'admin_notices', function() {
	if ( ! isset( $_GET['page'] ) || $_GET['page'] !== 'voyance-tirages' ) return;

	// Sauvegarde reussie
	if ( isset( $_GET['settings-updated'] ) && $_GET['settings-updated'] === 'true' ) {
		echo '<div class="notice notice-success is-dismissible"><p><strong>Voyance Tirages :</strong> Reglages enregistres avec succes !</p></div>';
	}

	// Creation page
	if ( isset( $_GET['vt_page_created'] ) ) {
		if ( $_GET['vt_page_created'] === '1' ) {
			echo '<div class="notice notice-success is-dismissible"><p>Page creee/mise a jour avec succes !</p></div>';
		} else {
			echo '<div class="notice notice-error is-dismissible"><p>Erreur lors de la creation de la page. Verifiez les permissions.</p></div>';
		}
	}
});

/* ============================================================
   RENDER ADMIN PAGE
   ============================================================ */
function vt_render_admin_page() {
	$active_tab = isset( $_GET['tab'] ) ? sanitize_text_field( $_GET['tab'] ) : 'applications';
	$tabs = array(
		'applications' => 'Applications',
		'branding'     => 'Branding',
		'app'          => 'App',
		'apis'         => 'APIs',
		'advanced'     => 'Avance',
		'logs'         => 'Logs',
	);

	$just_saved = isset( $_GET['settings-updated'] ) && $_GET['settings-updated'];
	?>
	<style>
	.vt-admin-subtabs{display:flex;gap:0.5rem;margin-bottom:1.5rem;border-bottom:2px solid rgba(237,140,230,0.2);padding-bottom:0;}
	.vt-admin-subtab{background:none;border:none;padding:0.6rem 1.25rem;font-size:0.875rem;font-weight:600;color:#646970;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .2s,border-color .2s;}
	.vt-admin-subtab.active,.vt-admin-subtab:hover{color:#ed8ce6;border-bottom-color:#ed8ce6;}
	.vt-admin-subtab-panel{display:none;}
	.vt-admin-subtab-panel.active{display:block;}
	</style>
	<div class="vt-admin-wrap">
		<!-- Header -->
		<div class="vt-admin-header">
			<div class="vt-admin-header-left">
				<div class="vt-admin-logo">
					<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
				</div>
				<div>
					<h1 class="vt-admin-title">Voyance Tirages</h1>
					<p class="vt-admin-subtitle">Voyance Tirages — Reglages</p>
				</div>
			</div>
			<div style="display:flex;align-items:center;gap:0.75rem;">
				<?php if ( $just_saved ) : ?>
				<span style="display:flex;align-items:center;gap:0.4rem;color:#16a34a;font-size:0.85rem;font-weight:600;">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
					Enregistre
				</span>
				<?php endif; ?>
				<button type="submit" form="vt-settings-form" class="vt-admin-save-btn" id="vt-header-save-btn">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
					Enregistrer
				</button>
			</div>
		</div>

		<!-- Onglets -->
		<div class="vt-admin-tabs">
			<?php foreach ( $tabs as $slug => $label ) : ?>
			<a href="<?php echo esc_url( admin_url( 'admin.php?page=voyance-tirages&tab=' . $slug ) ); ?>"
			   class="vt-admin-tab <?php echo $active_tab === $slug ? 'active' : ''; ?>">
				<?php echo esc_html( $label ); ?>
			</a>
			<?php endforeach; ?>
		</div>

		<!-- Formulaire -->
		<form id="vt-settings-form" method="post" action="options.php">
			<?php settings_fields( 'vt_settings_group' ); ?>

			<!-- Onglet 1 : Applications -->
			<div class="vt-admin-panel <?php echo $active_tab === 'applications' ? 'active' : ''; ?>">

				<?php
				$vt_am_slug   = get_option( 'vt_page_slug', 'tirage-compatibilite-amoureuse' );
				$vt_am_page   = get_page_by_path( $vt_am_slug, OBJECT, 'page' );
				$vt_am_url    = $vt_am_page ? get_permalink( $vt_am_page->ID ) : '';
				$vt_as_slug   = get_option( 'vt_astro_page_slug', 'tirage-compatibilite-astrologique' );
				$vt_as_page   = get_page_by_path( $vt_as_slug, OBJECT, 'page' );
				$vt_as_url    = $vt_as_page ? get_permalink( $vt_as_page->ID ) : '';
				?>

				<!-- App : Compat. Amoureuse -->
				<div class="vt-admin-card">
					<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
						<div>
							<h3 class="vt-admin-card-title" style="margin:0 0 0.25rem;">
								<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
								Compatibilite Amoureuse
							</h3>
							<p style="font-size:0.82rem;color:var(--vt-admin-text-muted);margin:0;">Analyse de compatibilite entre deux prenoms</p>
						</div>
						<label class="vt-admin-toggle">
							<input type="hidden" name="vt_app_amoureuse_enabled" value="0">
							<input type="checkbox" name="vt_app_amoureuse_enabled" value="1" <?php checked( get_option( 'vt_app_amoureuse_enabled', '0' ), '1' ); ?>>
							<span class="vt-admin-toggle-slider"></span>
						</label>
					</div>
					<div style="display:flex;align-items:center;gap:0.75rem;font-size:0.83rem;">
						<?php if ( $vt_am_page ) : ?>
						<span style="color:#16a34a;">&#10003; Page publiee — <code><?php echo esc_html( $vt_am_slug ); ?></code></span>
						<a href="<?php echo esc_url( $vt_am_url ); ?>" target="_blank" style="color:var(--vt-admin-accent);">Voir</a>
						<?php else : ?>
						<span style="color:#d97706;">Page absente</span>
						<a href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin.php?page=voyance-tirages&tab=applications&vt_create_page=1' ), 'vt_create_page' ) ); ?>" style="color:var(--vt-admin-accent);font-weight:600;">Creer la page</a>
						<?php endif; ?>
					</div>
				</div>

				<!-- App : Compat. Astrologique -->
				<div class="vt-admin-card">
					<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
						<div>
							<h3 class="vt-admin-card-title" style="margin:0 0 0.25rem;">
								<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
								Compatibilite Astrologique
							</h3>
							<p style="font-size:0.82rem;color:var(--vt-admin-text-muted);margin:0;">Analyse de compatibilite entre deux signes du zodiaque</p>
						</div>
						<label class="vt-admin-toggle">
							<input type="hidden" name="vt_app_astro_enabled" value="0">
							<input type="checkbox" name="vt_app_astro_enabled" value="1" <?php checked( get_option( 'vt_app_astro_enabled', '0' ), '1' ); ?>>
							<span class="vt-admin-toggle-slider"></span>
						</label>
					</div>
					<div style="display:flex;align-items:center;gap:0.75rem;font-size:0.83rem;">
						<?php if ( $vt_as_page ) : ?>
						<span style="color:#16a34a;">&#10003; Page publiee — <code><?php echo esc_html( $vt_as_slug ); ?></code></span>
						<a href="<?php echo esc_url( $vt_as_url ); ?>" target="_blank" style="color:var(--vt-admin-accent);">Voir</a>
						<?php else : ?>
						<span style="color:#d97706;">Page absente — configurez le slug dans l'onglet App puis enregistrez</span>
						<?php endif; ?>
					</div>
				</div>

			</div>

			<!-- Onglet 2 : Branding -->
			<div class="vt-admin-panel <?php echo $active_tab === 'branding' ? 'active' : ''; ?>">
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">
						<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
						Identite visuelle
					</h3>
					<div class="vt-admin-field">
						<label for="vt_brand_name">Nom de la marque</label>
						<input type="text" name="vt_brand_name" id="vt_brand_name" value="<?php echo esc_attr( get_option('vt_brand_name', 'Hexagon Voyance') ); ?>">
					</div>
					<div class="vt-admin-field">
						<label for="vt_brand_logo">Logo (URL)</label>
						<input type="text" name="vt_brand_logo" id="vt_brand_logo" value="<?php echo esc_attr( get_option('vt_brand_logo') ); ?>" placeholder="https://...">
						<p class="description">Utilisez la mediatheque WordPress pour heberger votre logo, puis collez l'URL ici.</p>
					</div>
					<div class="vt-admin-field">
						<label for="vt_brand_favicon">Favicon (URL)</label>
						<input type="text" name="vt_brand_favicon" id="vt_brand_favicon" value="<?php echo esc_attr( get_option('vt_brand_favicon') ); ?>" placeholder="https://...">
					</div>
				</div>
			</div>

			<!-- Onglet 3 : App -->
			<div class="vt-admin-panel <?php echo $active_tab === 'app' ? 'active' : ''; ?>">

				<!-- Sous-onglets App -->
				<div class="vt-admin-subtabs">
					<button type="button" class="vt-admin-subtab active" data-subtab="amoureuse">Compat. Amoureuse</button>
					<button type="button" class="vt-admin-subtab" data-subtab="astrologique">Compat. Astrologique</button>
				</div>

				<div class="vt-admin-subtab-panel active" data-subtab="amoureuse">

				<!-- Page & SEO -->
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">
						<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
						Page &amp; SEO
					</h3>
					<div class="vt-admin-field">
						<label for="vt_page_title">Titre de la page</label>
						<input type="text" name="vt_page_title" id="vt_page_title" value="<?php echo esc_attr( get_option( 'vt_page_title', 'Compatibilite Amoureuse' ) ); ?>">
					</div>
					<div class="vt-admin-field">
						<label for="vt_page_slug">Slug (URL)</label>
						<input type="text" name="vt_page_slug" id="vt_page_slug" value="<?php echo esc_attr( get_option( 'vt_page_slug', 'tirage-compatibilite-amoureuse' ) ); ?>">
						<p class="description">L'URL sera : <?php echo esc_url( home_url( '/' ) ); ?><span id="vt-slug-preview"><?php echo esc_html( get_option( 'vt_page_slug', 'tirage-compatibilite-amoureuse' ) ); ?></span></p>
					</div>
					<div class="vt-admin-field">
						<label for="vt_meta_title">Meta title</label>
						<input type="text" name="vt_meta_title" id="vt_meta_title" value="<?php echo esc_attr( get_option( 'vt_meta_title' ) ); ?>">
					</div>
					<div class="vt-admin-field">
						<label for="vt_meta_desc">Meta description</label>
						<textarea name="vt_meta_desc" id="vt_meta_desc" rows="3"><?php echo esc_textarea( get_option( 'vt_meta_desc' ) ); ?></textarea>
					</div>
				</div>

				<!-- Accueil -->
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">
						<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
						Ecran d'accueil
					</h3>
					<div class="vt-admin-field">
						<label for="vt_app_title">Titre principal</label>
						<input type="text" name="vt_app_title" id="vt_app_title" value="<?php echo esc_attr( get_option('vt_app_title', 'Compatibilite Amoureuse') ); ?>">
					</div>
					<div class="vt-admin-field">
						<label for="vt_app_desc">Description</label>
						<textarea name="vt_app_desc" id="vt_app_desc" rows="2"><?php echo esc_textarea( get_option('vt_app_desc') ); ?></textarea>
					</div>
					<div class="vt-admin-field">
						<label for="vt_app_btn_text">Texte du bouton</label>
						<input type="text" name="vt_app_btn_text" id="vt_app_btn_text" value="<?php echo esc_attr( get_option('vt_app_btn_text', 'Decouvrir ma compatibilite') ); ?>">
					</div>
					<div class="vt-admin-field">
						<label for="vt_counter_base">Compteur (nombre de base)</label>
						<input type="number" name="vt_counter_base" id="vt_counter_base" value="<?php echo esc_attr( get_option('vt_counter_base', 4200) ); ?>">
						<p class="description">Le compteur affiche ce nombre + un increment aleatoire.</p>
					</div>
				</div>

				<!-- Resultat / Email -->
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">
						<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
						Bon de reduction (email)
					</h3>
					<div class="vt-admin-field">
						<label for="vt_discount_pct">Reduction (%)</label>
						<input type="number" name="vt_discount_pct" id="vt_discount_pct" value="<?php echo esc_attr( get_option('vt_discount_pct', 30) ); ?>" min="1" max="99">
					</div>
					<div class="vt-admin-field">
						<label for="vt_email_title">Titre</label>
						<input type="text" name="vt_email_title" id="vt_email_title" value="<?php echo esc_attr( get_option('vt_email_title') ); ?>">
					</div>
					<div class="vt-admin-field">
						<label for="vt_email_desc">Description</label>
						<textarea name="vt_email_desc" id="vt_email_desc" rows="2"><?php echo esc_textarea( get_option('vt_email_desc') ); ?></textarea>
					</div>
					<div class="vt-admin-field">
						<label for="vt_email_btn">Texte bouton</label>
						<input type="text" name="vt_email_btn" id="vt_email_btn" value="<?php echo esc_attr( get_option('vt_email_btn') ); ?>">
					</div>
					<div class="vt-admin-field">
						<label for="vt_email_legal">Mentions legales</label>
						<textarea name="vt_email_legal" id="vt_email_legal" rows="2"><?php echo esc_textarea( get_option('vt_email_legal') ); ?></textarea>
					</div>
				</div>

				<!-- CTA Voyants -->
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">
						<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
						CTA Voyants
					</h3>
					<div class="vt-admin-toggle-row">
						<span class="vt-admin-toggle-label">Activer le CTA voyants</span>
						<label class="vt-admin-toggle">
							<input type="hidden" name="vt_cta_enabled" value="0">
							<input type="checkbox" id="vt_cta_enabled" name="vt_cta_enabled" value="1" <?php checked( get_option('vt_cta_enabled', false) ); ?>>
							<span class="vt-admin-toggle-slider"></span>
						</label>
					</div>
					<fieldset id="vt-cta-fieldset" <?php echo ! get_option('vt_cta_enabled', false) ? 'style="display:none;"' : ''; ?>>
						<div class="vt-admin-field" style="margin-top:0.75rem;">
							<label for="vt_cta_hook">Texte d'accroche</label>
							<input type="text" name="vt_cta_hook" id="vt_cta_hook" value="<?php echo esc_attr( get_option('vt_cta_hook') ); ?>">
						</div>
						<div class="vt-admin-field">
							<label for="vt_cta_btn_text">Texte du bouton</label>
							<input type="text" name="vt_cta_btn_text" id="vt_cta_btn_text" value="<?php echo esc_attr( get_option('vt_cta_btn_text') ); ?>">
						</div>
						<div class="vt-admin-field">
							<label for="vt_cta_url">URL destination</label>
							<input type="text" name="vt_cta_url" id="vt_cta_url" value="<?php echo esc_attr( get_option('vt_cta_url', '#') ); ?>">
						</div>
					</fieldset>
				</div>

				<!-- FAQ -->
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">
						<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
						FAQ SEO
					</h3>
					<div class="vt-admin-toggle-row">
						<span class="vt-admin-toggle-label">Afficher la FAQ</span>
						<label class="vt-admin-toggle">
							<input type="hidden" name="vt_faq_enabled" value="0">
							<input type="checkbox" name="vt_faq_enabled" value="1" <?php checked( get_option('vt_faq_enabled', true) ); ?>>
							<span class="vt-admin-toggle-slider"></span>
						</label>
					</div>
					<div class="vt-admin-field" style="margin-top:0.75rem;">
						<label for="vt_faq_title">Titre de la section</label>
						<input type="text" name="vt_faq_title" id="vt_faq_title" value="<?php echo esc_attr( get_option('vt_faq_title') ); ?>">
					</div>
					<?php for ( $i = 1; $i <= 5; $i++ ) : ?>
					<div class="vt-admin-field">
						<label>Question <?php echo $i; ?></label>
						<input type="text" name="vt_faq_q<?php echo $i; ?>" value="<?php echo esc_attr( get_option("vt_faq_q{$i}") ); ?>">
						<label style="margin-top:0.5rem;">Reponse <?php echo $i; ?></label>
						<textarea name="vt_faq_a<?php echo $i; ?>" rows="2"><?php echo esc_textarea( get_option("vt_faq_a{$i}") ); ?></textarea>
					</div>
					<?php endfor; ?>
				</div>

				<!-- Partage social -->
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">
						<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
						Partage social
					</h3>
					<div class="vt-admin-toggle-row">
						<span class="vt-admin-toggle-label">Activer les boutons de partage</span>
						<label class="vt-admin-toggle">
							<input type="hidden" name="vt_share_enabled" value="0">
							<input type="checkbox" name="vt_share_enabled" value="1" <?php checked( get_option('vt_share_enabled', true) ); ?>>
							<span class="vt-admin-toggle-slider"></span>
						</label>
					</div>
					<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.75rem;">
						<?php
						$platforms = array('facebook' => 'Facebook', 'whatsapp' => 'WhatsApp', 'tiktok' => 'TikTok', 'instagram' => 'Instagram', 'snapchat' => 'Snapchat');
						foreach ( $platforms as $key => $name ) :
						?>
						<div class="vt-admin-toggle-row">
							<span class="vt-admin-toggle-label"><?php echo $name; ?></span>
							<label class="vt-admin-toggle">
								<input type="hidden" name="vt_share_<?php echo $key; ?>" value="0">
								<input type="checkbox" name="vt_share_<?php echo $key; ?>" value="1" <?php checked( get_option("vt_share_{$key}", true) ); ?>>
								<span class="vt-admin-toggle-slider"></span>
							</label>
						</div>
						<?php endforeach; ?>
					</div>
				</div>

				</div><!-- /subtab-panel amoureuse -->

				<!-- Compat. Astrologique -->
				<div class="vt-admin-subtab-panel" data-subtab="astrologique">

					<!-- Page & SEO -->
					<div class="vt-admin-card">
						<h3 class="vt-admin-card-title">
							<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
							Page &amp; SEO
						</h3>
						<div class="vt-admin-field">
							<label for="vt_astro_page_title">Titre de la page</label>
							<input type="text" name="vt_astro_page_title" id="vt_astro_page_title" value="<?php echo esc_attr( get_option( 'vt_astro_page_title', 'Compatibilite Astrologique' ) ); ?>">
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_page_slug">Slug (URL)</label>
							<input type="text" name="vt_astro_page_slug" id="vt_astro_page_slug" value="<?php echo esc_attr( get_option( 'vt_astro_page_slug', 'tirage-compatibilite-astrologique' ) ); ?>">
							<p class="description">L'URL sera : <?php echo esc_url( home_url( '/' ) ); ?><span id="vt-astro-slug-preview"><?php echo esc_html( get_option( 'vt_astro_page_slug', 'tirage-compatibilite-astrologique' ) ); ?></span></p>
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_meta_title">Meta title</label>
							<input type="text" name="vt_astro_meta_title" id="vt_astro_meta_title" value="<?php echo esc_attr( get_option( 'vt_astro_meta_title' ) ); ?>">
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_meta_desc">Meta description</label>
							<textarea name="vt_astro_meta_desc" id="vt_astro_meta_desc" rows="3"><?php echo esc_textarea( get_option( 'vt_astro_meta_desc' ) ); ?></textarea>
						</div>
					</div>

					<!-- Accueil -->
					<div class="vt-admin-card">
						<h3 class="vt-admin-card-title">
							<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
							Ecran d'accueil
						</h3>
						<div class="vt-admin-field">
							<label for="vt_astro_app_title">Titre principal</label>
							<input type="text" name="vt_astro_app_title" id="vt_astro_app_title" value="<?php echo esc_attr( get_option('vt_astro_app_title', 'Compatibilite Astrologique') ); ?>">
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_app_desc">Description</label>
							<textarea name="vt_astro_app_desc" id="vt_astro_app_desc" rows="2"><?php echo esc_textarea( get_option('vt_astro_app_desc') ); ?></textarea>
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_app_btn_text">Texte du bouton</label>
							<input type="text" name="vt_astro_app_btn_text" id="vt_astro_app_btn_text" value="<?php echo esc_attr( get_option('vt_astro_app_btn_text', 'Decouvrir ma compatibilite') ); ?>">
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_counter_base">Compteur (nombre de base)</label>
							<input type="number" name="vt_astro_counter_base" id="vt_astro_counter_base" value="<?php echo esc_attr( get_option('vt_astro_counter_base', 4200) ); ?>">
							<p class="description">Le compteur affiche ce nombre + un increment aleatoire.</p>
						</div>
					</div>

					<!-- Theme par defaut -->
					<div class="vt-admin-card">
						<h3 class="vt-admin-card-title">
							<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
							Theme par defaut
						</h3>
						<div class="vt-admin-radio-group">
							<label class="vt-admin-radio">
								<input type="radio" name="vt_astro_default_theme" value="light" <?php checked( get_option('vt_astro_default_theme', 'light'), 'light' ); ?>>
								<div class="vt-admin-radio-card">
									<div class="vt-admin-radio-dot"></div>
									<span class="vt-admin-radio-name">Clair</span>
								</div>
							</label>
							<label class="vt-admin-radio">
								<input type="radio" name="vt_astro_default_theme" value="dark" <?php checked( get_option('vt_astro_default_theme'), 'dark' ); ?>>
								<div class="vt-admin-radio-card">
									<div class="vt-admin-radio-dot"></div>
									<span class="vt-admin-radio-name">Sombre</span>
								</div>
							</label>
						</div>
					</div>

					<!-- Bon de reduction (email) -->
					<div class="vt-admin-card">
						<h3 class="vt-admin-card-title">
							<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
							Bon de reduction (email)
						</h3>
						<div class="vt-admin-field">
							<label for="vt_astro_discount_pct">Reduction (%)</label>
							<input type="number" name="vt_astro_discount_pct" id="vt_astro_discount_pct" value="<?php echo esc_attr( get_option('vt_astro_discount_pct', 30) ); ?>" min="1" max="99">
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_email_title">Titre</label>
							<input type="text" name="vt_astro_email_title" id="vt_astro_email_title" value="<?php echo esc_attr( get_option('vt_astro_email_title') ); ?>">
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_email_desc">Description</label>
							<textarea name="vt_astro_email_desc" id="vt_astro_email_desc" rows="2"><?php echo esc_textarea( get_option('vt_astro_email_desc') ); ?></textarea>
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_email_btn">Texte bouton</label>
							<input type="text" name="vt_astro_email_btn" id="vt_astro_email_btn" value="<?php echo esc_attr( get_option('vt_astro_email_btn') ); ?>">
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_email_legal">Mentions legales</label>
							<textarea name="vt_astro_email_legal" id="vt_astro_email_legal" rows="2"><?php echo esc_textarea( get_option('vt_astro_email_legal') ); ?></textarea>
						</div>
					</div>

					<!-- CTA Voyants -->
					<div class="vt-admin-card">
						<h3 class="vt-admin-card-title">
							<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
							CTA Voyants
						</h3>
						<div class="vt-admin-toggle-row">
							<span class="vt-admin-toggle-label">Activer le CTA voyants</span>
							<label class="vt-admin-toggle">
								<input type="hidden" name="vt_astro_cta_enabled" value="0">
								<input type="checkbox" name="vt_astro_cta_enabled" value="1" <?php checked( get_option('vt_astro_cta_enabled', false) ); ?>>
								<span class="vt-admin-toggle-slider"></span>
							</label>
						</div>
						<div class="vt-admin-field" style="margin-top:0.75rem;">
							<label for="vt_astro_cta_hook">Texte d'accroche</label>
							<input type="text" name="vt_astro_cta_hook" id="vt_astro_cta_hook" value="<?php echo esc_attr( get_option('vt_astro_cta_hook') ); ?>">
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_cta_btn_text">Texte du bouton</label>
							<input type="text" name="vt_astro_cta_btn_text" id="vt_astro_cta_btn_text" value="<?php echo esc_attr( get_option('vt_astro_cta_btn_text') ); ?>">
						</div>
						<div class="vt-admin-field">
							<label for="vt_astro_cta_url">URL destination</label>
							<input type="url" name="vt_astro_cta_url" id="vt_astro_cta_url" value="<?php echo esc_attr( get_option('vt_astro_cta_url', '#') ); ?>">
						</div>
					</div>

					<!-- FAQ -->
					<div class="vt-admin-card">
						<h3 class="vt-admin-card-title">
							<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
							FAQ SEO
						</h3>
						<div class="vt-admin-toggle-row">
							<span class="vt-admin-toggle-label">Afficher la FAQ</span>
							<label class="vt-admin-toggle">
								<input type="hidden" name="vt_astro_faq_enabled" value="0">
								<input type="checkbox" name="vt_astro_faq_enabled" value="1" <?php checked( get_option('vt_astro_faq_enabled', true) ); ?>>
								<span class="vt-admin-toggle-slider"></span>
							</label>
						</div>
						<div class="vt-admin-field" style="margin-top:0.75rem;">
							<label for="vt_astro_faq_title">Titre de la section</label>
							<input type="text" name="vt_astro_faq_title" id="vt_astro_faq_title" value="<?php echo esc_attr( get_option('vt_astro_faq_title') ); ?>">
						</div>
						<?php for ( $i = 1; $i <= 5; $i++ ) : ?>
						<div class="vt-admin-field">
							<label>Question <?php echo $i; ?></label>
							<input type="text" name="vt_astro_faq_q<?php echo $i; ?>" value="<?php echo esc_attr( get_option("vt_astro_faq_q{$i}") ); ?>">
							<label style="margin-top:0.5rem;">Reponse <?php echo $i; ?></label>
							<textarea name="vt_astro_faq_a<?php echo $i; ?>" rows="2"><?php echo esc_textarea( get_option("vt_astro_faq_a{$i}") ); ?></textarea>
						</div>
						<?php endfor; ?>
					</div>

					<!-- Partage social -->
					<div class="vt-admin-card">
						<h3 class="vt-admin-card-title">
							<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
							Partage social
						</h3>
						<div class="vt-admin-toggle-row">
							<span class="vt-admin-toggle-label">Activer les boutons de partage</span>
							<label class="vt-admin-toggle">
								<input type="hidden" name="vt_astro_share_enabled" value="0">
								<input type="checkbox" name="vt_astro_share_enabled" value="1" <?php checked( get_option('vt_astro_share_enabled', true) ); ?>>
								<span class="vt-admin-toggle-slider"></span>
							</label>
						</div>
					</div>

				</div><!-- /subtab-panel astrologique -->
			</div>

			<!-- Onglet 4 : APIs -->
			<div class="vt-admin-panel <?php echo $active_tab === 'apis' ? 'active' : ''; ?>">

				<!-- Provider actif -->
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">
						<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>
						Provider IA actif
					</h3>
					<p style="font-size:0.82rem;color:var(--vt-admin-text-muted);margin:0 0 0.75rem;">Seul le provider selectionne sera utilise. Les cles API ne sont jamais exposees dans le navigateur.</p>
					<div class="vt-admin-radio-group">
						<label class="vt-admin-radio">
							<input type="radio" name="vt_ai_provider" value="mistral" <?php checked( get_option('vt_ai_provider', 'mistral'), 'mistral' ); ?>>
							<div class="vt-admin-radio-card">
								<div class="vt-admin-radio-dot"></div>
								<span class="vt-admin-radio-name">Mistral</span>
							</div>
						</label>
						<label class="vt-admin-radio">
							<input type="radio" name="vt_ai_provider" value="openai" <?php checked( get_option('vt_ai_provider'), 'openai' ); ?>>
							<div class="vt-admin-radio-card">
								<div class="vt-admin-radio-dot"></div>
								<span class="vt-admin-radio-name">OpenAI</span>
							</div>
						</label>
						<label class="vt-admin-radio">
							<input type="radio" name="vt_ai_provider" value="claude" <?php checked( get_option('vt_ai_provider'), 'claude' ); ?>>
							<div class="vt-admin-radio-card">
								<div class="vt-admin-radio-dot"></div>
								<span class="vt-admin-radio-name">Claude</span>
							</div>
						</label>
					</div>
				</div>

				<!-- Mistral -->
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">Mistral AI</h3>
					<div class="vt-admin-field">
						<label for="vt_ai_mistral_key">Cle API
							<?php $k = get_option('vt_ai_mistral_key'); if ( $k ) : ?><span style="color:#16a34a;font-size:0.78rem;font-weight:600;margin-left:0.5rem;">&#10003; Configuree (se termine par ...<?php echo esc_html( substr($k,-4) ); ?>)</span><?php else: ?><span style="color:#dc2626;font-size:0.78rem;margin-left:0.5rem;">Non configuree</span><?php endif; ?>
						</label>
						<div class="vt-admin-password-wrap">
							<input type="password" name="vt_ai_mistral_key" id="vt_ai_mistral_key" value="<?php echo esc_attr( get_option('vt_ai_mistral_key') ); ?>" placeholder="vxMist...">
							<button type="button" class="vt-admin-password-toggle" onclick="var f=this.previousElementSibling;f.type=f.type==='password'?'text':'password';">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							</button>
						</div>
						<button type="button" class="vt-admin-test-btn" data-provider="mistral" data-field="vt_ai_mistral_key">Tester la cle</button>
						<span class="vt-test-result" id="vt-test-mistral"></span>
					</div>
					<div class="vt-admin-field">
						<label for="vt_ai_mistral_model">Modele</label>
						<select name="vt_ai_mistral_model" id="vt_ai_mistral_model">
							<option value="mistral-small-latest" <?php selected( get_option('vt_ai_mistral_model', 'mistral-small-latest'), 'mistral-small-latest' ); ?>>mistral-small-latest</option>
							<option value="mistral-medium-latest" <?php selected( get_option('vt_ai_mistral_model'), 'mistral-medium-latest' ); ?>>mistral-medium-latest</option>
							<option value="mistral-large-latest" <?php selected( get_option('vt_ai_mistral_model'), 'mistral-large-latest' ); ?>>mistral-large-latest</option>
							<option value="open-mistral-nemo" <?php selected( get_option('vt_ai_mistral_model'), 'open-mistral-nemo' ); ?>>open-mistral-nemo</option>
						</select>
					</div>
				</div>

				<!-- OpenAI -->
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">OpenAI</h3>
					<div class="vt-admin-field">
						<label for="vt_ai_openai_key">Cle API
							<?php $k = get_option('vt_ai_openai_key'); if ( $k ) : ?><span style="color:#16a34a;font-size:0.78rem;font-weight:600;margin-left:0.5rem;">&#10003; Configuree (se termine par ...<?php echo esc_html( substr($k,-4) ); ?>)</span><?php else: ?><span style="color:#dc2626;font-size:0.78rem;margin-left:0.5rem;">Non configuree</span><?php endif; ?>
						</label>
						<div class="vt-admin-password-wrap">
							<input type="password" name="vt_ai_openai_key" id="vt_ai_openai_key" value="<?php echo esc_attr( get_option('vt_ai_openai_key') ); ?>" placeholder="sk-...">
							<button type="button" class="vt-admin-password-toggle" onclick="var f=this.previousElementSibling;f.type=f.type==='password'?'text':'password';">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							</button>
						</div>
						<button type="button" class="vt-admin-test-btn" data-provider="openai" data-field="vt_ai_openai_key">Tester la cle</button>
						<span class="vt-test-result" id="vt-test-openai"></span>
					</div>
					<div class="vt-admin-field">
						<label for="vt_ai_openai_model">Modele</label>
						<select name="vt_ai_openai_model" id="vt_ai_openai_model">
							<option value="gpt-4o-mini" <?php selected( get_option('vt_ai_openai_model', 'gpt-4o-mini'), 'gpt-4o-mini' ); ?>>gpt-4o-mini</option>
							<option value="gpt-4o" <?php selected( get_option('vt_ai_openai_model'), 'gpt-4o' ); ?>>gpt-4o</option>
							<option value="gpt-4.1-mini" <?php selected( get_option('vt_ai_openai_model'), 'gpt-4.1-mini' ); ?>>gpt-4.1-mini</option>
							<option value="gpt-4.1" <?php selected( get_option('vt_ai_openai_model'), 'gpt-4.1' ); ?>>gpt-4.1</option>
						</select>
					</div>
				</div>

				<!-- Claude -->
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">Claude (Anthropic)</h3>
					<div class="vt-admin-field">
						<label for="vt_ai_claude_key">Cle API
							<?php $k = get_option('vt_ai_claude_key'); if ( $k ) : ?><span style="color:#16a34a;font-size:0.78rem;font-weight:600;margin-left:0.5rem;">&#10003; Configuree (se termine par ...<?php echo esc_html( substr($k,-4) ); ?>)</span><?php else: ?><span style="color:#dc2626;font-size:0.78rem;margin-left:0.5rem;">Non configuree</span><?php endif; ?>
						</label>
						<div class="vt-admin-password-wrap">
							<input type="password" name="vt_ai_claude_key" id="vt_ai_claude_key" value="<?php echo esc_attr( get_option('vt_ai_claude_key') ); ?>" placeholder="sk-ant-...">
							<button type="button" class="vt-admin-password-toggle" onclick="var f=this.previousElementSibling;f.type=f.type==='password'?'text':'password';">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							</button>
						</div>
						<button type="button" class="vt-admin-test-btn" data-provider="claude" data-field="vt_ai_claude_key">Tester la cle</button>
						<span class="vt-test-result" id="vt-test-claude"></span>
					</div>
					<div class="vt-admin-field">
						<label for="vt_ai_claude_model">Modele</label>
						<select name="vt_ai_claude_model" id="vt_ai_claude_model">
							<option value="claude-sonnet-4-6-20250514" <?php selected( get_option('vt_ai_claude_model', 'claude-sonnet-4-6-20250514'), 'claude-sonnet-4-6-20250514' ); ?>>claude-sonnet-4-6</option>
							<option value="claude-haiku-4-5-20251001" <?php selected( get_option('vt_ai_claude_model'), 'claude-haiku-4-5-20251001' ); ?>>claude-haiku-4-5</option>
						</select>
					</div>
				</div>

				<!-- Brevo -->
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">
						<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
						Brevo (Email)
					</h3>
					<div class="vt-admin-field">
						<label for="vt_brevo_key">Cle API
							<?php $k = get_option('vt_brevo_key'); if ( $k ) : ?>
							<span style="color:#16a34a;font-size:0.78rem;font-weight:600;margin-left:0.5rem;">&#10003; Configuree (se termine par ...<?php echo esc_html( substr($k,-4) ); ?>)</span>
							<?php else: ?>
							<span style="color:#dc2626;font-size:0.78rem;margin-left:0.5rem;">Non configuree</span>
							<?php endif; ?>
						</label>
						<div class="vt-admin-password-wrap">
							<input type="password" name="vt_brevo_key" id="vt_brevo_key" value="<?php echo esc_attr( get_option('vt_brevo_key') ); ?>" placeholder="xkeysib-...">
							<button type="button" class="vt-admin-password-toggle" onclick="var f=this.previousElementSibling;f.type=f.type==='password'?'text':'password';">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							</button>
						</div>
						<button type="button" class="vt-admin-test-btn" data-provider="brevo" data-field="vt_brevo_key">Tester la cle</button>
						<span class="vt-test-result" id="vt-test-brevo"></span>
					</div>
					<div class="vt-admin-field">
						<label for="vt_brevo_list_id">List ID</label>
						<input type="text" name="vt_brevo_list_id" id="vt_brevo_list_id" value="<?php echo esc_attr( get_option('vt_brevo_list_id') ); ?>" placeholder="Ex : 42">
					</div>
				</div>
			</div>

			<!-- Onglet 5 : Avance -->
			<div class="vt-admin-panel <?php echo $active_tab === 'advanced' ? 'active' : ''; ?>">
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">
						<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
						Reglages avances
					</h3>

					<div class="vt-admin-toggle-row">
						<span class="vt-admin-toggle-label">Voix (TTS — lecture vocale)</span>
						<label class="vt-admin-toggle">
							<input type="hidden" name="vt_tts_enabled" value="0">
							<input type="checkbox" name="vt_tts_enabled" value="1" <?php checked( get_option('vt_tts_enabled', false) ); ?>>
							<span class="vt-admin-toggle-slider"></span>
						</label>
					</div>

					<div class="vt-admin-toggle-row">
						<span class="vt-admin-toggle-label">Limite de tirages par jour</span>
						<label class="vt-admin-toggle">
							<input type="hidden" name="vt_rate_limit_enabled" value="0">
							<input type="checkbox" name="vt_rate_limit_enabled" value="1" <?php checked( get_option('vt_rate_limit_enabled', false) ); ?>>
							<span class="vt-admin-toggle-slider"></span>
						</label>
					</div>

					<div style="display:flex;gap:1rem;margin-top:0.5rem;">
						<div class="vt-admin-field">
							<label for="vt_rate_free">Tirages gratuits/jour</label>
							<input type="number" name="vt_rate_free" id="vt_rate_free" value="<?php echo esc_attr( get_option('vt_rate_free', 3) ); ?>" min="1">
						</div>
						<div class="vt-admin-field">
							<label for="vt_rate_extended">Tirages apres email</label>
							<input type="number" name="vt_rate_extended" id="vt_rate_extended" value="<?php echo esc_attr( get_option('vt_rate_extended', 8) ); ?>" min="1">
						</div>
					</div>

					<div class="vt-admin-field" style="margin-top:1rem;">
						<label>Theme par defaut</label>
						<div class="vt-admin-radio-group">
							<label class="vt-admin-radio">
								<input type="radio" name="vt_default_theme" value="light" <?php checked( get_option('vt_default_theme', 'light'), 'light' ); ?>>
								<div class="vt-admin-radio-card">
									<div class="vt-admin-radio-dot"></div>
									<span class="vt-admin-radio-name">Clair</span>
								</div>
							</label>
							<label class="vt-admin-radio">
								<input type="radio" name="vt_default_theme" value="dark" <?php checked( get_option('vt_default_theme'), 'dark' ); ?>>
								<div class="vt-admin-radio-card">
									<div class="vt-admin-radio-dot"></div>
									<span class="vt-admin-radio-name">Sombre</span>
								</div>
							</label>
						</div>
					</div>

					<div class="vt-admin-toggle-row" style="margin-top:0.75rem;">
						<span class="vt-admin-toggle-label">Bouton toggle theme (clair/sombre)</span>
						<label class="vt-admin-toggle">
							<input type="hidden" name="vt_theme_toggle" value="0">
							<input type="checkbox" name="vt_theme_toggle" value="1" <?php checked( get_option('vt_theme_toggle', true) ); ?>>
							<span class="vt-admin-toggle-slider"></span>
						</label>
					</div>
				</div>
			</div>

			<!-- Onglet 6 : Logs -->
			<div class="vt-admin-panel <?php echo $active_tab === 'logs' ? 'active' : ''; ?>">
				<div class="vt-admin-card">
					<h3 class="vt-admin-card-title">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
						Journal d'activite
					</h3>
					<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
						<span id="vt-log-count" style="font-size:0.85rem;color:#646970;">
							<?php echo VT_Logger::count(); ?> entrees
						</span>
						<button type="button" id="vt-clear-log-btn" class="button button-small" style="color:#d63638;">
							Vider le log
						</button>
						<button type="button" id="vt-refresh-log-btn" class="button button-small">
							Rafraichir
						</button>
					</div>
					<div id="vt-log-viewer" style="background:#0d1117;color:#c9d1d9;border-radius:8px;padding:1rem;max-height:500px;overflow-y:auto;font-family:monospace;font-size:12px;line-height:1.7;">
						<?php
						$entries = VT_Logger::get_entries( 200 );
						if ( empty( $entries ) ) :
							echo '<span style="color:#8b949e;">Aucune activite enregistree.</span>';
						else :
							foreach ( $entries as $entry ) :
								$color = '#8b949e';
								$badge = 'INFO';
								switch ( $entry['level'] ) {
									case 'error':   $color = '#f85149'; $badge = 'ERR';  break;
									case 'warning': $color = '#d29922'; $badge = 'WARN'; break;
									case 'success': $color = '#3fb950'; $badge = 'OK';   break;
									case 'info':    $color = '#58a6ff'; $badge = 'INFO'; break;
								}
								echo '<div style="border-bottom:1px solid #21262d;padding:2px 0;">';
								echo '<span style="color:#484f58;">' . esc_html( $entry['time'] ) . '</span> ';
								echo '<span style="color:' . $color . ';font-weight:600;">[' . $badge . ']</span> ';
								echo '<span>' . esc_html( $entry['message'] ) . '</span>';
								echo '</div>';
							endforeach;
						endif;
						?>
					</div>
				</div>
			</div>

			<!-- Footer save -->
			<div class="vt-admin-footer">
				<button type="submit" name="vt_save_settings" class="vt-admin-save-btn">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
					Enregistrer les reglages
				</button>
			</div>
		</form>

		<!-- Toast -->
		<div class="vt-admin-toast" id="vt-admin-toast">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
			<span id="vt-admin-toast-text">Reglages enregistres !</span>
		</div>
	</div>

	<script>
	jQuery(document).ready(function($) {
		// Toast apres sauvegarde
		<?php if ( isset( $_GET['settings-updated'] ) && $_GET['settings-updated'] ) : ?>
		var toast = document.getElementById('vt-admin-toast');
		var toastText = document.getElementById('vt-admin-toast-text');
		toastText.textContent = 'Reglages enregistres avec succes !';
		toast.classList.add('visible');
		setTimeout(function() { toast.classList.remove('visible'); }, 6000);
		<?php endif; ?>

		// Live preview slug
		$('#vt_page_slug').on('input', function() {
			$('#vt-slug-preview').text($(this).val());
		});
		$('#vt_astro_page_slug').on('input', function() {
			$('#vt-astro-slug-preview').text($(this).val());
		});

		// CTA toggle show/hide fieldset
		$('#vt_cta_enabled').on('change', function() {
			var fieldset = $('#vt-cta-fieldset');
			if ($(this).is(':checked')) {
				fieldset.show();
			} else {
				fieldset.hide();
			}
		});

		// === Log viewer (AJAX) ===
		var logNonce = '<?php echo esc_js( wp_create_nonce( "vt_admin_nonce" ) ); ?>';

		$('#vt-clear-log-btn').on('click', function() {
			if (!confirm('Vider tout le journal ?')) return;
			$.post(ajaxurl, {
				action: 'vt_clear_log',
				nonce: logNonce
			}, function(res) {
				if (res.success) {
					$('#vt-log-viewer').html('<span style="color:#8b949e;">Aucune activite enregistree.</span>');
					$('#vt-log-count').text('0 entrees');
				} else {
					alert('Erreur : ' + (res.data && res.data.message || ''));
				}
			});
		});

		$('#vt-refresh-log-btn').on('click', function() {
			location.reload();
		});

		// === Sous-onglets App ===
		$('.vt-admin-subtab').on('click', function() {
			var target = $(this).data('subtab');
			$(this).siblings().removeClass('active');
			$(this).addClass('active');
			$(this).closest('.vt-admin-panel').find('.vt-admin-subtab-panel').removeClass('active');
			$(this).closest('.vt-admin-panel').find('.vt-admin-subtab-panel[data-subtab="' + target + '"]').addClass('active');
		});

		// === Test de cle API ===
		$('.vt-admin-test-btn').on('click', function() {
			var btn      = $(this);
			var provider = btn.data('provider');
			var fieldId  = btn.data('field');
			var key      = $('#' + fieldId).val();
			var $result  = $('#vt-test-' + provider);

			btn.prop('disabled', true).text('Test en cours...');
			$result.attr('class', 'vt-test-result').text('');

			$.post(ajaxurl, {
				action:   'vt_test_api_key',
				nonce:    logNonce,
				provider: provider,
				key:      key
			}, function(res) {
				btn.prop('disabled', false).text('Tester la cle');
				if (res.success) {
					$result.addClass('vt-test-ok').text('✓ ' + res.data.message);
				} else {
					$result.addClass('vt-test-error').text('✗ ' + (res.data && res.data.message ? res.data.message : 'Erreur inconnue.'));
				}
			}).fail(function() {
				btn.prop('disabled', false).text('Tester la cle');
				$result.addClass('vt-test-error').text('✗ Erreur de connexion au serveur.');
			});
		});
	});
	</script>
	<?php
}
