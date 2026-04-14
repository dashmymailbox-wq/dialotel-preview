# CHANGELOG — Plugin Voyance Tirages (Dialotel / Hexagon Voyance)

Toutes les modifications apportees au plugin WordPress `voyance-tirages`.

---

## [2.0.1] — 2026-04-14

### Fixes
- **Logo introuvable dans l'image de partage** : l'URL du logo etait hardcodee en chemin relatif (`../wordpress/assets/...`), incompatible WordPress. Maintenant lue dynamiquement depuis la config PHP, avec fallback pour la preview HTML locale.
  - Fichiers : `assets/js/compatibilite-amoureuse.js`, `templates/tirages/compatibilite-amoureuse.php`
- **Police Lato jamais chargee** : les Google Fonts chargeaient `Cinzel` + `DM Sans` au lieu de `Cinzel` + `Lato`. La police Lato est utilisee dans tout le theme et l'image de partage.
  - Fichier : `includes/enqueue.php`
- **@font-face mort pour Catchy Mager** : la declaration pointait vers `fonts/CatchyMager.woff2` qui n'existe pas. Supprime — Cinzel (deja charge via Google Fonts) est le fallback direct.
  - Fichier : `assets/css/theme-dialotel.css`
- **Checkboxes impossibles a decocher** : les checkboxes du formulaire admin n'envoyaient pas de valeur quand elles etaient decochees (comportement HTML). Ajout de hidden inputs `value="0"` avant chaque checkbox + sanitize callback pour garantir la persistance de l'etat decoche.
  - Fichier : `includes/settings.php`

### Docs
- **README-install.md** : reecriture complete pour documenter l'installation WordPress (upload zip, activation, configuration, shortcodes).

### Build
- **wordpress.zip** : regenere avec toutes les corrections ci-dessus (142 Ko).

---

## [2.0.0] — 2026-04-11

### Added
- Plugin WordPress complet : `voyance-tirages.php` + includes + templates + assets
- Page admin avec 6 onglets : Page & SEO, Branding, App, APIs, Avance, Logs
- Proxy AJAX pour les appels IA (Mistral, OpenAI, Claude) — cles API cote serveur
- Proxy AJAX pour la capture email (Brevo)
- Shortcode `[tirage_voyance type="compatibilite-amoureuse"]`
- Creation automatique de la page WordPress au premier enregistrement
- Theme Dialotel : fond blanc, rose/jaune, mandala fractal hexagonal
- Mode sombre/clair avec toggle
- Splash screen avec logo
- Image de partage canvas (coeur anime + score + prenoms)
- Boutons de partage : Facebook, WhatsApp, TikTok, Instagram, Snapchat
- Section FAQ SEO (5 questions/reponses configurables)
- TTS (lecture vocale du resultat)
- Limitation de tirages (gratuits + etendus apres email)
- Journal d'activite en temps reel (logs)
