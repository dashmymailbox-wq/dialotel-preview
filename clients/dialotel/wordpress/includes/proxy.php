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

	$provider = get_option( 'vt_ai_provider', 'mistral' );
	$api_key  = '';
	$model    = '';

	switch ( $provider ) {
		case 'mistral':
			$api_key = get_option( 'vt_ai_mistral_key', '' );
			$model   = get_option( 'vt_ai_mistral_model', 'mistral-small-latest' );
			break;
		case 'openai':
			$api_key = get_option( 'vt_ai_openai_key', '' );
			$model   = get_option( 'vt_ai_openai_model', 'gpt-4o-mini' );
			break;
		case 'claude':
			$api_key = get_option( 'vt_ai_claude_key', '' );
			$model   = get_option( 'vt_ai_claude_model', 'claude-sonnet-4-6-20250514' );
			break;
		default:
			wp_send_json_error( array( 'message' => 'Provider non supporte.' ), 400 );
	}

	if ( empty( $api_key ) ) {
		wp_send_json_error( array( 'message' => 'Cle API non configuree.' ), 500 );
	}

	// Construction messages
	$messages = array();
	if ( ! empty( $system_prompt ) ) {
		$messages[] = array( 'role' => 'system', 'content' => $system_prompt );
	}
	$messages[] = array( 'role' => 'user', 'content' => $prompt );

	// Appel selon le provider
	$response = null;
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
	}

	if ( is_wp_error( $response ) ) {
		VT_Logger::log( 'IA Erreur (' . $provider . ') : ' . $response->get_error_message(), 'error' );
		wp_send_json_error( array( 'message' => 'Erreur lors de la consultation IA. Reessayez.' ), 500 );
	}

	VT_Logger::log( 'IA OK (' . $provider . '/' . $model . ')', 'success' );
	wp_send_json_success( array( 'content' => $response ) );
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
		// FIX 3 : Logger le detail, retourner un message generique
		VT_Logger::log( 'Mistral API ' . $code . ' : ' . wp_json_encode( $data ), 'error' );
		return new WP_Error( 'mistral_error', 'Erreur temporaire du service IA.' );
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
		return new WP_Error( 'openai_error', 'Erreur temporaire du service IA.' );
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
		return new WP_Error( 'claude_error', 'Erreur temporaire du service IA.' );
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
