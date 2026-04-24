import { NextRequest, NextResponse } from 'next/server';
import { getVideoInfo } from '@/lib/youtube';

export async function POST(request: NextRequest) {
  try {
    const { url, videoId } = await request.json();

    if (!url || !videoId) {
      return NextResponse.json(
        { error: 'URL and videoId are required' },
        { status: 400 }
      );
    }

    console.log(`🎬 Detecting video: ${videoId}`);
    const videoInfo = await getVideoInfo(url);
    console.log(`✅ Video detected: ${videoInfo.title} (${videoInfo.duration}s)`);

    return NextResponse.json(videoInfo);
  } catch (error: any) {
    console.error('❌ Error detecting video:', error);
    
    // Messages d'erreur plus explicites
    let errorMessage = error.message || 'Failed to detect video';
    
    if (error.message?.includes('Sign in to confirm')) {
      errorMessage = 'Cette vidéo nécessite une connexion YouTube. Essayez une autre vidéo publique.';
    } else if (error.message?.includes('Video unavailable')) {
      errorMessage = 'Cette vidéo n\'est pas disponible. Vérifiez qu\'elle est publique.';
    } else if (error.message?.includes('Invalid YouTube URL')) {
      errorMessage = 'URL YouTube invalide. Format attendu: https://www.youtube.com/watch?v=...';
    } else if (error.message?.includes('private')) {
      errorMessage = 'Cette vidéo est privée ou restreinte.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
