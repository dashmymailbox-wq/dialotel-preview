# Z-AI Plugin Tirages
> Développeur senior d'une suite d'apps web de tirage (compatibilité amoureuse, tarot, numérologie) en HTML/CSS/JS pur, livrables en plugin WordPress et CodeCanyon.

## Stack
- HTML / CSS / JS pur (pas de framework, pas de build tool)
- API Mistral (tirage IA)
- TTS ElevenLabs (optionnel Phase 3)
- WordPress (Phase 1B à démarrer)
- Git local

## Fichiers clés
| Fichier/Dossier | Rôle |
|---|---|
| assets/css/themes/ | Thèmes (mystique, dialotel) — variables CSS var(--theme-*) |
| assets/js/core.js | Moteur partagé : étapes, limiteur quota, API, i18n, analytics |
| assets/data/ | JSON : tarot, astrologie, config, i18n, prompts |
| assets/animations/ | Banque CSS : transitions, loaders, cards, reveal |
| [nom-tirage].html | 4 apps HTML : compatibilité-amoureuse, -astrologique, tarot, numérologie |
| clients/dialotel/ | White label Dialotel : theme sobre, config, font locale |

## Architecture
Socle Phase 1 complet : CSS global (variables, reset scopé) + core.js (étapes, IA, limiteur, i18n, analytics) + banque animations. Chaque tirage = HTML + CSS + JS métier autonomes. Phase 1B : intégration plugin WordPress (shortcodes, enqueue, thème dialotel). Monétisation : compteur social-proof, limiteur quota/jour, modale email, CTA voyants.

## État actuel
✅ Phase 1 : socle, CSS, JS core, animations, SVG zodiac, 4 apps HTML complètes
❌ Bloqueurs : clé API Mistral manquante, font CatchyMager.woff2 non reçue, counterBase/quotas non définis, URL landing non définie
⏳ Phase 1B : à démarrer (plugin WordPress avec shortcodes + enqueue)

## Prochaines étapes
1. Récupérer clé API Mistral — l'injecter dans core.js + tester tirage IA
2. Obtenir CatchyMager.woff2 de Dialotel → clients/dialotel/fonts/
3. Définir counterBase + quotas (freePerDay, extendedPerDay) par app dans config
4. Démarrer Phase 1B : créer plugin WordPress Dialotel (shortcodes, enqueue assets)

## Commandes
```bash
open compatibilite-amoureuse.html        # Tester une app
cat PROJECT.md                            # Vision produit
cat SPEC.md                               # Règles techniques
cat TODO.md                               # État d'avancement
```
