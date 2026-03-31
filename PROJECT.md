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
| **Phase 1** | Apps HTML statiques autonomes, architecture simulant le futur plugin | En cours |
| **Phase 2** | Plugin WordPress : shortcodes, enqueue CSS/JS, settings admin, thèmes | À venir |
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

- **Version commerciale** — design system complet, tous les thèmes, pour clients futurs (non développée pour l'instant)
- **Version white label** — mêmes apps, thème custom par client, livré en zip installé par le product owner

### Client actuel : Dialotel
- Site de livraison : hexagon-voyance
- Thème : theme-dialotel
- Palette : #ed8ce6 (rose) / #e2ed77 (jaune) / #ffffff (fond) / #000000 (texte)
- Ambiance : claire, pas de fond sombre — inverse du thème mystique par défaut
- Font titres : Catchy Mager (fichier à récupérer auprès du client → clients/dialotel/fonts/)
- Font corps : héritage du thème WordPress hôte
- Livraison : zip installé manuellement par le product owner
- Accès client au code : non

---

## Personnes & rôles

| Rôle | Note |
|------|------|
| Product owner | Non développeur — décisions produit/design |
| Développement | IA assistée (Claude Code) |
| Intégration WordPress | Phase 2 |