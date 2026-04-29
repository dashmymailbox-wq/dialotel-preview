<?php
/**
 * Logger — Journal d'evenements du plugin Voyance Tirages.
 *
 * Stocke les entrees dans wp_options (max 500 lignes, rotation automatique).
 * Utilise : VT_Logger::log( 'message', 'level' );
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class VT_Logger {

	const OPTION_KEY  = 'vt_log';
	const MAX_ENTRIES = 500;

	/* ============================================================
	   ECRIRE
	   ============================================================ */

	/**
	 * Ajouter une entree au log.
	 *
	 * @param string $message  Texte du log.
	 * @param string $level    info | success | warning | error.
	 */
	public static function log( $message, $level = 'info' ) {
		$entries = self::_get_all();

		$entries[] = array(
			'time'    => current_time( 'mysql' ),
			'level'   => sanitize_key( $level ),
			'message' => sanitize_text_field( $message ),
		);

		// Rotation : garder les MAX_ENTRIES plus recents
		if ( count( $entries ) > self::MAX_ENTRIES ) {
			$entries = array_slice( $entries, -self::MAX_ENTRIES );
		}

		update_option( self::OPTION_KEY, $entries, false ); // pas de autoload
	}

	/* ============================================================
	   LIRE
	   ============================================================ */

	/**
	 * Recuperer les entrees du log.
	 *
	 * @param int $limit  Nombre max d'entrees (les plus recentes en premier).
	 */
	public static function get_entries( $limit = 200 ) {
		$entries = self::_get_all();
		return array_slice( array_reverse( $entries ), 0, $limit );
	}

	/**
	 * Nombre total d'entrees.
	 */
	public static function count() {
		return count( self::_get_all() );
	}

	/* ============================================================
	   VIDER
	   ============================================================ */

	/**
	 * Supprimer tout le log.
	 */
	public static function clear() {
		update_option( self::OPTION_KEY, array(), false );
	}

	/* ============================================================
	   PRIVE
	   ============================================================ */

	private static function _get_all() {
		$raw = get_option( self::OPTION_KEY, array() );
		return is_array( $raw ) ? $raw : array();
	}
}
