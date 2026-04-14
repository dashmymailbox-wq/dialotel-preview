# CHANGELOG — Plugin Voyance Tirages (Dialotel / Hexagon Voyance)

Toutes les modifications apportees au plugin WordPress `voyance-tirages`.

---

## [2.0.2] — 2026-04-14

### Added
- **Module Partage Social complet** : les 5 boutons de partage (Facebook, WhatsApp, TikTok, Instagram, Snapchat) etaient decoratifs et ne faisaient rien. Maintenant chaque bouton declenche une action reelle.
  - Bouton "Partager mon score" qui genere l'image Canvas et l'affiche dans une modale
  - **Facebook** : partage via `sharer.php` avec l'URL de la page
  - **WhatsApp** : partage via `wa.me` avec texte + lien
  - **TikTok / Instagram / Snapchat** : mode assiste — generation de l'image + message d'instructions
  - **Web Share API** : utilise le partage natif du systeme sur mobile quand disponible
  - Boutons "Copier le lien" et "Copier la caption" dans la modale
  - Telechargement de l'image PNG
  - Couleurs specifiques par plateforme (bleu Facebook, vert WhatsApp, etc.)
  - Fichiers : `templates/tirages/compatibilite-amoureuse.php`, `assets/js/compatibilite-amoureuse.js`, `assets/css/theme-dialotel.css`
- **Open Graph meta tags** : injection automatique de `og:title`, `og:description`, `og:url`, `og:image` quand la page contient le shortcode `[tirage_voyance]`. Ameliore l'apperçu lors du partage sur Facebook et WhatsApp.
  - Fichier : `includes/enqueue.php`

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
