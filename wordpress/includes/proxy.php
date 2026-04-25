<?php
/**
 * Proxy IA + Email — wp-ajax pour masquer les cles API.
 *
 * Providers IA : Mistral, OpenAI, Claude (Anthropic)
 * Provider Email : Brevo
 *
 * Securite :
 *   - Nonce verification sur chaque requete
 *   - Rate limit basique (transient par IP)
 *   - Prompt limite a 4000 caracteres
 *   - Messages d'erreur generiques (pas de fuite API)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ============================================================
   RATE LIMIT — Protection anti-abus
   ============================================================ */
function vt_check_rate_limit( $action = 'ai', $max = 10, $window = 60 ) {
	$ip      = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
	$key     = 'vt_rate_' . $action . '_' . md5( $ip );
	$counter = get_transient( $key );

	if ( false === $counter ) {
		set_transient( $key, 1, $window );
		return true;
	}

	if ( $counter >= $max ) {
		return false;
	}

	set_transient( $key, $counter + 1, $window );
	return true;
}

/* ============================================================
   PROXY IA — helpers retry/fallback
   ============================================================ */

// Retourne la liste ordonnee des providers a essayer :
// le provider actif en premier, puis ceux qui ont une cle configuree.
function vt_build_provider_chain() {
	$primary = get_option( 'vt_ai_provider', 'mistral' );
	$chain   = array( $primary );
	foreach ( array( 'mistral', 'openai', 'claude' ) as $p ) {
		if ( $p !== $primary && ! empty( get_option( "vt_ai_{$p}_key", '' ) ) ) {
			$chain[] = $p;
		}
	}
	return $chain;
}

// Retourne array('key'=>..., 'model'=>...) ou false si cle absente.
function vt_get_provider_config( $provider ) {
	$defaults = array(
		'mistral' => array( 'key_opt' => 'vt_ai_mistral_key', 'model_opt' => 'vt_ai_mistral_model', 'model_default' => 'mistral-small-latest' ),
		'openai'  => array( 'key_opt' => 'vt_ai_openai_key',  'model_opt' => 'vt_ai_openai_model',  'model_default' => 'gpt-4o-mini' ),
		'claude'  => array( 'key_opt' => 'vt_ai_claude_key',  'model_opt' => 'vt_ai_claude_model',  'model_default' => 'claude-sonnet-4-6-20250514' ),
	);
	if ( ! isset( $defaults[ $provider ] ) ) return false;
	$d   = $defaults[ $provider ];
	$key = get_option( $d['key_opt'], '' );
	if ( empty( $key ) ) return false;
	return array(
		'key'   => $key,
		'model' => get_option( $d['model_opt'], $d['model_default'] ),
	);
}

/* ============================================================
   PROXY IA
   ============================================================ */
add_action( 'wp_ajax_vt_ai_proxy', 'vt_ai_proxy' );
add_action( 'wp_ajax_nopriv_vt_ai_proxy', 'vt_ai_proxy' );

function vt_ai_proxy() {
	// FIX 1 : Nonce verification (CSRF)
	$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
	if ( ! wp_verify_nonce( $nonce, 'vt_proxy_nonce' ) ) {
		wp_send_json_error( array( 'message' => 'Requete non autorisee.' ), 403 );
	}

	// Rate limit — max 10 requetes/minute par IP
	if ( ! vt_check_rate_limit( 'ai', 10, MINUTE_IN_SECONDS ) ) {
		VT_Logger::log( 'Rate limit IA atteint', 'warning' );
		wp_send_json_error( array( 'message' => 'Trop de requetes. Reessayez dans un instant.' ), 429 );
	}

	$prompt       = isset( $_POST['prompt'] ) ? sanitize_textarea_field( wp_unslash( $_POST['prompt'] ) ) : '';
	$system_prompt = isset( $_POST['systemPrompt'] ) ? sanitize_textarea_field( wp_unslash( $_POST['systemPrompt'] ) ) : '';

	if ( empty( $prompt ) ) {
		wp_send_json_error( array( 'message' => 'Prompt vide.' ), 400 );
	}

	// FIX 4 : Limite de taille du prompt
	if ( mb_strlen( $prompt ) > 4000 ) {
		wp_send_json_error( array( 'message' => 'Prompt trop long (max 4000 caracteres).' ), 400 );
	}

	// Construction messages (base commune pour tous les providers)
	$messages = array();
	if ( ! empty( $system_prompt ) ) {
		$messages[] = array( 'role' => 'system', 'content' => $system_prompt );
	}
	$messages[] = array( 'role' => 'user', 'content' => $prompt );

	// Retry + fallback : provider actif en premier, puis backup si cle configuree
	$chain       = vt_build_provider_chain();
	$max_retries = 2;

	foreach ( $chain as $provider ) {
		$config = vt_get_provider_config( $provider );
		if ( ! $config ) continue;

		$api_key = $config['key'];
		$model   = $config['model'];

		for ( $attempt = 1; $attempt <= $max_retries; $attempt++ ) {
			if ( $attempt > 1 ) sleep( 1 );

			switch ( $provider ) {
				case 'mistral':
					$response = vt_call_mistral( $api_key, $model, $messages );
					break;
				case 'openai':
					$response = vt_call_openai( $api_key, $model, $messages );
					break;
				case 'claude':
					$response = vt_call_claude( $api_key, $model, $prompt, $system_prompt );
					break;
				default:
					continue 2;
			}

			if ( ! is_wp_error( $response ) ) {
				VT_Logger::log( 'IA OK (' . $provider . '/' . $model . ', tentative ' . $attempt . ')', 'success' );
				wp_send_json_success( array( 'content' => $response ) );
				return;
			}

			$error_data = $response->get_error_data();
			$http_code  = isset( $error_data['http_code'] ) ? (int) $error_data['http_code'] : 0;
			VT_Logger::log( 'IA erreur ' . ( $http_code ?: 'reseau' ) . ' (' . $provider . ', tentative ' . $attempt . ')', 'warning' );

			// Erreur d'authentification : inutile de retenter ce provider
			if ( in_array( $http_code, array( 401, 403 ), true ) ) break;
		}
	}

	// Tous les providers/retries ont echoue
	VT_Logger::log( 'IA : tous les providers ont echoue', 'error' );
	wp_send_json_error( array( 'message' => 'Service momentanement indisponible. Reessayez dans quelques instants.' ), 503 );
}

/* --- Mistral --- */
function vt_call_mistral( $api_key, $model, $messages ) {
	$response = wp_remote_post( 'https://api.mistral.ai/v1/chat/completions', array(
		'headers' => array(
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . $api_key,
		),
		'body'    => wp_json_encode( array(
			'model'    => $model,
			'messages' => $messages,
		) ),
		'timeout' => 30,
	) );

	if ( is_wp_error( $response ) ) return $response;

	$code = wp_remote_retrieve_response_code( $response );
	$data = json_decode( wp_remote_retrieve_body( $response ), true );

	if ( $code >= 400 ) {
		VT_Logger::log( 'Mistral API ' . $code . ' : ' . wp_json_encode( $data ), 'error' );
		return new WP_Error( 'mistral_error', 'Erreur temporaire du service IA.', array( 'http_code' => $code ) );
	}

	if ( isset( $data['choices'][0]['message']['content'] ) ) {
		return $data['choices'][0]['message']['content'];
	}

	return new WP_Error( 'mistral_parse', 'Reponse IA illisible.' );
}

/* --- OpenAI --- */
function vt_call_openai( $api_key, $model, $messages ) {
	$response = wp_remote_post( 'https://api.openai.com/v1/chat/completions', array(
		'headers' => array(
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . $api_key,
		),
		'body'    => wp_json_encode( array(
			'model'    => $model,
			'messages' => $messages,
		) ),
		'timeout' => 30,
	) );

	if ( is_wp_error( $response ) ) return $response;

	$code = wp_remote_retrieve_response_code( $response );
	$data = json_decode( wp_remote_retrieve_body( $response ), true );

	if ( $code >= 400 ) {
		VT_Logger::log( 'OpenAI API ' . $code . ' : ' . wp_json_encode( $data ), 'error' );
		return new WP_Error( 'openai_error', 'Erreur temporaire du service IA.', array( 'http_code' => $code ) );
	}

	if ( isset( $data['choices'][0]['message']['content'] ) ) {
		return $data['choices'][0]['message']['content'];
	}

	return new WP_Error( 'openai_parse', 'Reponse IA illisible.' );
}

/* --- Claude (Anthropic) --- */
function vt_call_claude( $api_key, $model, $prompt, $system_prompt ) {
	$body = array(
		'model'      => $model,
		'max_tokens' => 2048,
		'messages'   => array(
			array( 'role' => 'user', 'content' => $prompt ),
		),
	);
	if ( ! empty( $system_prompt ) ) {
		$body['system'] = $system_prompt;
	}

	$response = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
		'headers' => array(
			'Content-Type'      => 'application/json',
			'x-api-key'         => $api_key,
			'anthropic-version' => '2023-06-01',
		),
		'body'    => wp_json_encode( $body ),
		'timeout' => 30,
	) );

	if ( is_wp_error( $response ) ) return $response;

	$code = wp_remote_retrieve_response_code( $response );
	$data = json_decode( wp_remote_retrieve_body( $response ), true );

	if ( $code >= 400 ) {
		VT_Logger::log( 'Claude API ' . $code . ' : ' . wp_json_encode( $data ), 'error' );
		return new WP_Error( 'claude_error', 'Erreur temporaire du service IA.', array( 'http_code' => $code ) );
	}

	if ( isset( $data['content'][0]['text'] ) ) {
		return $data['content'][0]['text'];
	}

	return new WP_Error( 'claude_parse', 'Reponse IA illisible.' );
}

/* ============================================================
   PROXY EMAIL (Brevo)
   ============================================================ */
add_action( 'wp_ajax_vt_email_proxy', 'vt_email_proxy' );
add_action( 'wp_ajax_nopriv_vt_email_proxy', 'vt_email_proxy' );

function vt_email_proxy() {
	// FIX 1 : Nonce verification
	$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
	if ( ! wp_verify_nonce( $nonce, 'vt_proxy_nonce' ) ) {
		wp_send_json_error( array( 'message' => 'Requete non autorisee.' ), 403 );
	}

	// FIX 2 : Rate limit — max 5 emails/minute par IP
	if ( ! vt_check_rate_limit( 'email', 5, MINUTE_IN_SECONDS ) ) {
		wp_send_json_error( array( 'message' => 'Trop de requetes. Reessayez dans un instant.' ), 429 );
	}

	$email = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';

	if ( empty( $email ) || ! is_email( $email ) ) {
		wp_send_json_error( array( 'message' => 'Email invalide.' ), 400 );
	}

	$api_key = get_option( 'vt_brevo_key', '' );
	$list_id = get_option( 'vt_brevo_list_id', '' );

	if ( empty( $api_key ) ) {
		wp_send_json_error( array( 'message' => 'Service email non configure.' ), 500 );
	}

	$body = array(
		'email'        => $email,
		'updateEnabled' => true,
	);
	if ( ! empty( $list_id ) ) {
		$body['listIds'] = array( intval( $list_id ) );
	}

	$response = wp_remote_post( 'https://api.brevo.com/v3/contacts', array(
		'headers' => array(
			'Content-Type' => 'application/json',
			'api-key'      => $api_key,
		),
		'body'    => wp_json_encode( $body ),
		'timeout' => 15,
	) );

	if ( is_wp_error( $response ) ) {
		VT_Logger::log( 'Brevo ' . $response->get_error_message(), 'error' );
		wp_send_json_error( array( 'message' => 'Erreur temporaire. Reessayez.' ), 500 );
	}

	$code = wp_remote_retrieve_response_code( $response );
	// 204 = contact existe deja, c'est OK
	if ( $code >= 400 && $code !== 204 ) {
		$details = json_decode( wp_remote_retrieve_body( $response ), true );
		VT_Logger::log( 'Brevo API ' . $code . ' : ' . wp_json_encode( $details ), 'error' );
		wp_send_json_error( array( 'message' => 'Erreur temporaire. Reessayez.' ), $code );
	}

	VT_Logger::log( 'Email enregistre : ' . $email, 'success' );
	wp_send_json_success( array( 'message' => 'Email enregistre.' ) );
}

/* ============================================================
   CLEAR LOG (AJAX)
   ============================================================ */
add_action( 'wp_ajax_vt_clear_log', 'vt_clear_log' );

function vt_clear_log() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => 'Non autorise.' ), 403 );
	}
	check_ajax_referer( 'vt_admin_nonce', 'nonce' );
	VT_Logger::clear();
	wp_send_json_success( array( 'message' => 'Log vide.' ) );
}
