# YouTube Shorts Generator 🎬

Application Next.js TypeScript permettant de transformer automatiquement des vidéos YouTube en shorts captivants avec l'aide de l'IA.

## 🌟 Fonctionnalités

1. **Détection de vidéo YouTube** 📺
   - Input d'URL YouTube
   - Aperçu instantané avec métadonnées
   - Validation et extraction d'informations

2. **Éditeur vidéo intelligent** ✂️
   - Timeline interactive avec segments détectés
   - Visualisation des meilleurs moments (30-60s)
   - Sélection/désélection de segments
   - Preview vidéo intégré

3. **Génération automatique** 🤖
   - Extraction automatique des segments sélectionnés
   - Génération de métadonnées avec OpenAI (GPT-4o-mini)
   - Titres et descriptions optimisés pour les shorts
   - Export en format vertical (1080x1920)

## 🛠️ Stack Technique

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Base de données**: Prisma + SQLite (configurable pour PostgreSQL/MySQL)
- **Vidéo**: 
  - `ytdl-core` pour téléchargement YouTube
  - `FFmpeg` pour traitement vidéo
  - `react-player` pour preview
- **IA**: OpenAI GPT-4o-mini pour métadonnées
- **State Management**: Zustand (optionnel)

## 📋 Prérequis

- Node.js 18+ 
- npm/yarn/pnpm
- FFmpeg installé sur le système
- Clé API OpenAI

## 🚀 Installation

1. **Cloner et installer les dépendances**

```bash
cd youtubeurl_to_shorts
npm install
```

2. **Configurer les variables d'environnement**

```bash
cp .env.example .env
```

Éditer `.env`:

```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

3. **Installer FFmpeg**

**macOS**:
```bash
brew install ffmpeg
```

**Linux**:
```bash
sudo apt-get install ffmpeg
```

**Windows**: Télécharger depuis [ffmpeg.org](https://ffmpeg.org/download.html)

4. **Initialiser la base de données**

```bash
npx prisma generate
npx prisma db push
```

5. **Lancer en développement**

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## 📁 Structure du Projet

```
youtubeurl_to_shorts/
├── prisma/
│   └── schema.prisma          # Schéma de base de données
├── src/
│   ├── app/
│   │   ├── api/               # API Routes
│   │   │   ├── video/         # Endpoints vidéo
│   │   │   └── segment/       # Endpoints segments
│   │   ├── layout.tsx         # Layout principal
│   │   ├── page.tsx           # Page d'accueil
│   │   └── globals.css        # Styles globaux
│   ├── components/
│   │   ├── VideoInput.tsx     # Input URL YouTube
│   │   ├── VideoEditor.tsx    # Éditeur principal
│   │   ├── VideoTimeline.tsx  # Timeline interactive
│   │   └── ProcessingStatus.tsx # Statut de traitement
│   └── lib/
│       ├── prisma.ts          # Client Prisma
│       ├── openai.ts          # Intégration OpenAI
│       ├── youtube.ts         # Utilitaires YouTube
│       └── video-processing.ts # Traitement FFmpeg
├── public/
│   ├── uploads/               # Vidéos téléchargées
│   └── outputs/               # Shorts générés
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 🎯 Utilisation

### 1. Importer une vidéo YouTube

- Coller l'URL d'une vidéo YouTube
- L'application détecte et affiche un aperçu
- Cliquer sur "Continuer vers l'éditeur"

### 2. Éditer les segments

- L'IA analyse automatiquement la vidéo
- Les meilleurs moments sont surlignés sur la timeline
- Cliquer sur un segment pour le sélectionner/désélectionner
- Utiliser le bouton "Voir le segment" pour prévisualiser

### 3. Générer les shorts

- Cliquer sur "Générer les Shorts"
- L'application:
  - Télécharge la vidéo YouTube
  - Extrait les segments sélectionnés
  - Génère titres et descriptions avec OpenAI
  - Convertit au format vertical (1080x1920)
- Télécharger individuellement ou en ZIP

## 🔧 Configuration Avancée

### Personnaliser l'algorithme de détection

Éditer `src/lib/openai.ts` - fonction `analyzeVideoForBestMoments`:

```typescript
const targetDuration = 45; // Durée cible en secondes
const minDuration = 30;    // Durée minimum
const maxDuration = 60;    // Durée maximum
const numSegments = 5;     // Nombre de segments maximum
```

### Intégration OpenAI Vision (Avancé)

Pour utiliser l'analyse visuelle réelle:

```typescript
// Dans src/lib/openai.ts
export async function analyzeVideoSegment(...) {
  // Extraire des frames avec FFmpeg
  // Envoyer à OpenAI Vision API
  // Générer métadonnées basées sur le contenu visuel
}
```

### Base de données PostgreSQL

Modifier `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 📊 API Endpoints

### Vidéos

- `POST /api/video/detect` - Détecter une vidéo YouTube
- `POST /api/video/create` - Créer une entrée vidéo
- `GET /api/video/[id]` - Récupérer une vidéo
- `POST /api/video/[id]/analyze` - Analyser pour segments
- `POST /api/video/[id]/process` - Traiter les segments
- `GET /api/video/[id]/status` - Statut du traitement

### Segments

- `PATCH /api/segment/[id]/toggle` - Toggle sélection

## 🎨 Personnalisation UI

Les couleurs et styles sont dans `src/app/globals.css` et `tailwind.config.ts`.

Thème principal: Gradient purple/pink

## 🐛 Dépannage

### Erreur FFmpeg

Vérifier l'installation:
```bash
ffmpeg -version
```

### Erreur ytdl-core

Si YouTube bloque les requêtes, utiliser `yt-dlp` comme alternative:

```bash
npm install yt-dlp-exec
```

### Erreur OpenAI

Vérifier la clé API et les quotas sur [platform.openai.com](https://platform.openai.com)

## 🚧 Limitations Actuelles

- **Algorithme simplifié**: L'analyse des segments utilise un algorithme basique. Pour une vraie détection, il faut:
  - Analyse audio (détection de pics, silences)
  - Analyse visuelle (changements de scène)
  - OpenAI Vision sur frames extraites

- **Traitement synchrone**: Le processing est synchrone. Pour la production, utiliser:
  - Queue système (Bull, BullMQ)
  - Workers dédiés
  - WebSockets pour updates en temps réel

- **YouTube download**: ytdl-core peut être bloqué. Alternatives:
  - yt-dlp (plus robuste)
  - Services tiers d'API YouTube

## 🔮 Améliorations Futures

1. **Analyse vidéo avancée**
   - Détection de scènes avec OpenCV
   - Analyse audio avec librosa
   - OpenAI Vision pour frames

2. **Éditeur amélioré**
   - Trim manuel des segments
   - Ajout de transitions
   - Overlay de texte et sous-titres

3. **Workflow asynchrone**
   - Queue système avec Redis
   - WebSockets pour updates live
   - Progression granulaire

4. **Export avancé**
   - Formats multiples
   - Compression optimisée
   - Upload direct vers YouTube/TikTok

## 📄 Licence

MIT

## 👨‍💻 Support

Pour questions et support, ouvrir une issue sur le repository.

---

Créé avec ❤️ par votre équipe de développement