#!/bin/bash

echo "🚀 YouTube Shorts Generator - Quick Start"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) détecté"

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg n'est pas installé."
    echo "   Pour macOS: brew install ffmpeg"
    echo "   Pour Linux: sudo apt-get install ffmpeg"
    echo "   Pour Windows: Télécharger depuis https://ffmpeg.org/download.html"
    read -p "Continuer sans FFmpeg? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ FFmpeg détecté"
fi

# Install dependencies
echo ""
echo "📦 Installation des dépendances..."
npm install

# Setup environment
if [ ! -f .env ]; then
    echo ""
    echo "🔧 Configuration de l'environnement..."
    cp .env.example .env
    echo "⚠️  N'oubliez pas de configurer votre clé OpenAI dans .env"
fi

# Setup Prisma
echo ""
echo "🗄️  Initialisation de la base de données..."
npx prisma generate
npx prisma db push

echo ""
echo "✅ Installation terminée!"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Éditer .env et ajouter votre clé OpenAI"
echo "   2. Lancer: npm run dev"
echo "   3. Ouvrir: http://localhost:3000"
echo ""
echo "🎬 Bon développement!"
