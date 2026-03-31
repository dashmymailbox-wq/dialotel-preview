# Installation — Hexagon Voyance (Dialotel)

## Fichiers a uploader

1. Uploader le contenu du dossier `dist/` sur votre serveur WordPress
2. Placer les fichiers CSS dans le dossier du theme enfant ou via un plugin d'injection CSS
3. Placer le fichier HTML a la racine ou dans une page dediee

## Configuration

1. Editer `config/hexagon-voyance.config.json` :
   - Remplacer `REMPLACER_ICI` par votre cle API Mistral dans `ai.apiKey`
   - Remplacer `REMPLACER_ICI` par l'URL de votre landing voyants dans `ctaVoyants.url`
   - Remplacer `REMPLACER_ICI` par votre cle API Brevo dans `emailCapture.apiKey` (si utilise)

2. Police Catchy Mager :
   - Placer le fichier `CatchyMager.woff2` dans `fonts/` a cote du theme
   - Si absent, le theme WordPress hote sera utilise automatiquement

## Integration WordPress (Phase 1)

En Phase 1, l'app est autonome (fichier HTML).
En Phase 2, un shortcode `[tirage_voyance type="compatibilite-amoureuse" theme="dialotel"]` sera disponible.

## Support

Pour toute question, contacter l'equipe de developpement.
