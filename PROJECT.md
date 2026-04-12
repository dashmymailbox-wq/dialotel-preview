# PROJECT.md — Voyance Tirages
> Vision produit & contexte. À lire en premier pour comprendre le projet.
> Dernière mise à jour : Mars 2026

---

## Résumé

Création d'une suite d'applications web de tirage pour un site de voyance.
Chaque app est une expérience guidée, immersive et visuellement cohérente (compatibilité amoureuse, signes astrologiques, tarot, numérologie, etc.).
Les apps sont développées en HTML / CSS / JS pur, puis regroupées dans un plugin WordPress accessible via shortcodes.

---

## Phases du projet

| Phase | Périmètre | Statut |
|-------|-----------|--------|
| **Phase 1** | Socle partagé + apps HTML autonomes (theme mystique pour dev) | En cours |
| **Phase 1B** | Plugin WordPress Dialotel — adaptation design sobre, livraison specifique | À venir |
| **Phase 2** | Plugin commercial Code Canyon — catalogue themes/animations, settings admin, customisation | À venir |
| **Phase 3** | Voix IA premium (ElevenLabs), proxy API côté serveur, Gutenberg widgets | Optionnel |

---

## Apps de tirage prévues

| Tirage | Inputs | Outputs |
|--------|--------|---------|
| Compatibilité amoureuse | Prénom ×2, date de naissance ×2 | Score, résumé, points forts/tensions, conseil |
| Compatibilité astrologique | Signe ×2 | Score, profil combiné, traits, conseils |
| Tirage tarot | Intention / question | 3 cartes + interprétation |
| Numérologie | Prénom complet, date de naissance | Chiffre de vie, description |
| Autres | À définir | — |

---

## Contraintes produit

- Aucun tirage premium — toutes les apps sont gratuites avec limiteur de quota
- Aucune intervention serveur requise pour la Phase 1
- Compatible avec n'importe quel thème ou page builder WordPress (Elementor, Divi, Bricks, Oxygen, WPBakery, Kadence, Astra, GeneratePress...)
- Pas de framework JS, pas de build tool
- Tout le code doit être directement exploitable par un développeur ou une IA sans configuration préalable

---

## Monétisation & conversion

- **Compteur social-proof** : affiche un chiffre de tirages effectués ce mois (valeur de départ configurable par app)
- **Limiteur de tirages** : quota gratuit par jour, déblocage via capture email
- **Capture email** : modale post-résultat configurable (provider, champs, bon de réduction)
- **CTA voyants** : bouton personnalisable pointant vers une landing page de voyants
- **Pas de tirages premium**

---

## Stack technique décidée

| Composant | Choix | Raison |
|-----------|-------|--------|
| Langage | HTML / CSS / JS natif | Compatibilité universelle WordPress |
| Animations | CSS pur (@keyframes + transitions) | Zéro dépendance, compatible tous builders |
| Données | JSON inline (<script type="application/json">) | Zéro fetch local, zéro config serveur |
| IA | Mistral (défaut) — adaptateur multi-provider | Rapport qualité/prix, facilement switchable |
| TTS | Web Speech API (navigateur natif) | Zéro dépendance — option ElevenLabs en Phase 3 |
| Email | Mailchimp / Brevo / webhook générique | Configurable par app |
| Analytics | GTM dataLayer events | Compatible tout outil analytics |
| i18n | Fichiers JSON par locale | Simple à maintenir, pas d'outil dédié requis |
| Thèmes | Variables CSS (var(--theme-*)) | Zéro duplication HTML/JS |

---

## Direction artistique

- Ambiance : mystique, élégante, moderne, immersive
- Éviter : rendu gadget, enfantin, template SaaS générique
- Couleurs obligatoires : #ed8ce6 (rose) / #e2ed77 (jaune) / #000000 (titres)
- Font titres : Catchy Mager (fichier local)
- Icônes UI : Feather Icons uniquement — stroke-width 1px — jamais d'emoji
- Icônes astrologiques : sprite SVG maison, style Hybride (glyphe + halo cercle) — voir zodiac-preview.pdf
- Boutons : hexagone étiré adaptatif
- Responsive mobile-first

---

## Modèle de distribution

### Produit 1 — Plugin Dialotel (sur mesure)
- Plugin WordPress dédié aux sites Dialotel (hexagon-voyance, etc.)
- Design avec identité visuelle Dialotel : fond blanc, effets visuels propres, animations dédiées
- Un set fixe d'animations/effects (transition, loader, reveal, carte) — toujours les mêmes sur toutes les apps
- Pas de catalogue, pas de choix — les effets sont définis une fois pour toutes
- Thème Dialotel (Catchy Mager, palette rose/jaune sur blanc)
- Livraison : zip installé manuellement par le product owner
- Accès client au code : non

### Produit 2 — Plugin commercial (Code Canyon)
- Même moteur, livré avec un catalogue exhaustif de designs
- Thèmes prêts à l'emploi, animations, transitions, polices, palettes au choix
- L'acheteur choisit, mixe et customise depuis les réglages WP
- Aucune référence à Dialotel

### Ce qui est partagé
- Le moteur : core.js, les apps HTML, les données JSON

### Ce qui diffère
- Les effets visuels et animations (set fixe Dialotel vs catalogue Code Canyon)
- Les thèmes CSS
- Les settings admin

---

## Personnes & rôles

| Rôle | Note |
|------|------|
| Product owner | Non développeur — décisions produit/design |
| Développement | IA assistée (Claude Code) |
| Intégration WordPress | Phase 2 |