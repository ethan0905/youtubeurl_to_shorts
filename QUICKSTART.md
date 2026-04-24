# Quick Start Guide 🚀

## Installation Rapide

### 1. Prérequis

Assurez-vous d'avoir installé:
- Node.js 18+ ([télécharger](https://nodejs.org/))
- FFmpeg ([installation](#installer-ffmpeg))
- Une clé API OpenAI ([obtenir](https://platform.openai.com/api-keys))

### 2. Installation Automatique

```bash
chmod +x setup.sh
./setup.sh
```

Ou manuellement:

```bash
# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env

# Initialiser la base de données
npx prisma generate
npx prisma db push
```

### 3. Configuration

Éditer `.env` et ajouter votre clé API OpenAI:

```env
OPENAI_API_KEY="sk-votre-cle-ici"
```

### 4. Lancer l'application

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Installer FFmpeg

### macOS

```bash
brew install ffmpeg
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

### Windows

1. Télécharger depuis [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extraire dans `C:\ffmpeg`
3. Ajouter `C:\ffmpeg\bin` au PATH système

## Tester l'Installation

```bash
# Vérifier Node.js
node -v

# Vérifier FFmpeg
ffmpeg -version

# Vérifier les dépendances npm
npm list --depth=0
```

## Workflow d'Utilisation

1. **Coller une URL YouTube** → L'app détecte automatiquement la vidéo
2. **Voir les segments détectés** → L'IA propose les meilleurs moments
3. **Sélectionner/désélectionner** → Cliquer sur les segments dans la timeline
4. **Générer les shorts** → L'app crée les vidéos avec métadonnées AI
5. **Télécharger** → Récupérer les shorts générés

## Architecture Simplifiée

```
Input URL YouTube
    ↓
Détection vidéo (ytdl-core)
    ↓
Analyse IA (segments optimaux)
    ↓
Édition timeline (React)
    ↓
Processing (FFmpeg + OpenAI)
    ↓
Output shorts + métadonnées
```

## Dépendances Principales

| Package | Version | Usage |
|---------|---------|-------|
| Next.js | 14.2 | Framework React |
| Prisma | 5.12 | ORM Base de données |
| OpenAI | 4.36 | Génération métadonnées |
| ytdl-core | 4.11 | Téléchargement YouTube |
| react-player | 2.16 | Player vidéo |
| Tailwind CSS | 3.4 | Styling |

## Options de Personnalisation

### Modifier la durée des segments

Éditer [src/lib/openai.ts](src/lib/openai.ts#L40):

```typescript
const targetDuration = 45; // 30-60s recommandé
```

### Nombre de segments détectés

```typescript
const numSegments = Math.min(5, Math.floor(duration / 60));
```

### Format de sortie

Éditer [src/lib/video-processing.ts](src/lib/video-processing.ts):

```typescript
resolution: '1080x1920' // Vertical pour shorts
// ou '1920x1080' pour horizontal
```

## Troubleshooting Commun

### Erreur: "ytdl-core: Unable to retrieve video info"

YouTube peut bloquer les requêtes. Solution:
```bash
npm install @distube/ytdl-core
```

### Erreur: "OpenAI API key invalid"

1. Vérifier `.env` contient la bonne clé
2. Vérifier les quotas sur platform.openai.com
3. Redémarrer le serveur dev

### Erreur: "FFmpeg not found"

Installer FFmpeg (voir section ci-dessus) et vérifier avec:
```bash
which ffmpeg  # macOS/Linux
where ffmpeg  # Windows
```

## Performance Tips

- Utiliser des vidéos de 5-30 minutes pour de meilleurs résultats
- Limiter à 3-5 segments par vidéo
- Pour production: utiliser une queue (Bull/Redis) au lieu de processing synchrone

## Prochaines Étapes

- [ ] Ajouter queue système pour processing asynchrone
- [ ] Intégrer OpenAI Vision pour vraie analyse visuelle
- [ ] Ajouter détection audio (pics, silences)
- [ ] Export vers YouTube/TikTok API
- [ ] Ajout de transitions et overlays

---

Besoin d'aide? Consultez le [README complet](README.md)
