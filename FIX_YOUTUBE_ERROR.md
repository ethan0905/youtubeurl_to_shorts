# Fix: Erreur de détection vidéo YouTube 🔧

## Problème résolu

L'erreur `Failed to get video information` était causée par `ytdl-core` qui est souvent bloqué par YouTube.

## Solution implémentée

J'ai ajouté un système de **fallback multiple** qui essaie 4 méthodes différentes dans l'ordre:

### 1. YouTube Data API v3 (Optionnel - Recommandé) ⭐
- **Avantage**: Le plus fiable, rapide, officiel
- **Inconvénient**: Nécessite une clé API (gratuite)
- **Quota gratuit**: 10,000 points/jour (suffisant pour des centaines de vidéos)

### 2. ytdl-core (Par défaut)
- **Avantage**: Aucune configuration
- **Inconvénient**: Peut être bloqué par YouTube

### 3. Web Scraping
- **Avantage**: Fallback automatique
- **Inconvénient**: Peut casser si YouTube change sa page

### 4. oEmbed API
- **Avantage**: Simple, toujours disponible
- **Inconvénient**: Ne fournit pas la durée

## Comment activer l'API YouTube (Recommandé)

### Étape 1: Créer un projet Google Cloud

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet (ou utiliser un existant)
3. Nom: "YouTube Shorts Generator"

### Étape 2: Activer l'API YouTube Data v3

1. Dans le menu, aller à **APIs & Services** → **Library**
2. Chercher "YouTube Data API v3"
3. Cliquer sur **Enable**

### Étape 3: Créer une clé API

1. Aller à **APIs & Services** → **Credentials**
2. Cliquer **Create Credentials** → **API Key**
3. Copier la clé générée

### Étape 4: Configurer l'application

Éditer votre fichier `.env`:

```env
YOUTUBE_API_KEY="AIzaSy..."
```

Redémarrer le serveur:

```bash
npm run dev
```

## Test

Maintenant, essayez à nouveau avec votre vidéo de 22 minutes. L'application va:

1. ✅ Essayer l'API YouTube (si configurée) - devrait fonctionner
2. ❌ Sinon essayer ytdl-core - peut échouer
3. ✅ Sinon essayer le scraping - devrait fonctionner
4. ✅ Sinon essayer oEmbed - fonctionne mais sans durée

## Logs améliorés

Dans votre terminal, vous verrez maintenant:

```
🎬 Detecting video: dQw4w9WgXcQ
Trying method: YouTube Data API...
✅ Success with YouTube Data API
✅ Video detected: Never Gonna Give You Up (213s)
```

Ou si une méthode échoue:

```
Trying method: ytdl-core...
❌ ytdl-core failed: Status code 403
Trying method: scraping...
✅ Success with scraping
```

## Sans API YouTube

Si vous ne voulez pas configurer l'API YouTube, l'app fonctionnera quand même avec les fallbacks, mais:
- Peut être plus lent
- Peut échouer sur certaines vidéos
- Moins fiable à long terme

## Messages d'erreur améliorés

L'utilisateur verra maintenant des messages plus clairs:
- "Cette vidéo nécessite une connexion YouTube"
- "Cette vidéo n'est pas disponible"
- "URL YouTube invalide"
- "Cette vidéo est privée ou restreinte"

## Quotas API YouTube

L'API gratuite YouTube donne **10,000 points/jour**:
- 1 requête = 1 point
- Soit ~10,000 vidéos détectées par jour
- Largement suffisant pour une utilisation normale

## Alternative: yt-dlp

Si les problèmes persistent, vous pouvez aussi installer `yt-dlp`:

```bash
# macOS
brew install yt-dlp

# Puis installer le wrapper Node
npm install yt-dlp-exec
```

Et je peux modifier le code pour l'utiliser.

---

**Testez maintenant** votre vidéo de 22 minutes, ça devrait fonctionner! 🎉
