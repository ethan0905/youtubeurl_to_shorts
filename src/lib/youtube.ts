import ytdl from 'ytdl-core';
import axios from 'axios';

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
}

// Méthode 1: ytdl-core (peut être bloqué)
async function getVideoInfoYtdl(url: string): Promise<VideoInfo> {
  const info = await ytdl.getInfo(url, {
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    },
  });
  
  return {
    id: info.videoDetails.videoId,
    title: info.videoDetails.title,
    thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url || '',
    duration: parseInt(info.videoDetails.lengthSeconds),
  };
}

// Méthode 2: Scraping HTML page (fallback)
async function getVideoInfoScrape(videoId: string): Promise<VideoInfo> {
  const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const html = response.data;
  
  // Extraire les données du script ytInitialPlayerResponse
  const match = html.match(/var ytInitialPlayerResponse = ({.+?});/);
  if (!match) {
    throw new Error('Could not find video data in page');
  }

  const data = JSON.parse(match[1]);
  const videoDetails = data.videoDetails;

  return {
    id: videoId,
    title: videoDetails.title || 'Unknown Title',
    thumbnail: videoDetails.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    duration: parseInt(videoDetails.lengthSeconds) || 0,
  };
}

// Méthode 3: YouTube Data API v3 (le plus fiable si clé API disponible)
async function getVideoInfoYouTubeAPI(videoId: string): Promise<VideoInfo> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube API key not configured');
  }

  const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'snippet,contentDetails',
      id: videoId,
      key: apiKey,
    },
  });

  if (!response.data.items || response.data.items.length === 0) {
    throw new Error('Video not found');
  }

  const video = response.data.items[0];
  const duration = parseDuration(video.contentDetails.duration);

  return {
    id: videoId,
    title: video.snippet.title,
    thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
    duration,
  };
}

// Parser la durée ISO 8601 (ex: PT22M30S -> 1350 secondes)
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Méthode 4: YouTube oEmbed API (simple mais limité)
async function getVideoInfoOembed(videoId: string): Promise<VideoInfo> {
  const response = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
  
  return {
    id: videoId,
    title: response.data.title || 'Unknown Title',
    thumbnail: response.data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    duration: 0, // oEmbed doesn't provide duration
  };
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // Essayer différentes méthodes dans l'ordre
  const methods = [
    // Si l'API YouTube est configurée, l'utiliser en premier (plus fiable)
    ...(process.env.YOUTUBE_API_KEY 
      ? [{ name: 'YouTube Data API', fn: () => getVideoInfoYouTubeAPI(videoId) }] 
      : []
    ),
    { name: 'ytdl-core', fn: () => getVideoInfoYtdl(url) },
    { name: 'scraping', fn: () => getVideoInfoScrape(videoId) },
    { name: 'oembed', fn: () => getVideoInfoOembed(videoId) },
  ];

  let lastError: Error | null = null;

  for (const method of methods) {
    try {
      console.log(`Trying method: ${method.name}...`);
      const info = await method.fn();
      console.log(`✅ Success with ${method.name}`);
      return info;
    } catch (error: any) {
      console.log(`❌ ${method.name} failed:`, error.message);
      lastError = error;
      continue;
    }
  }

  throw new Error(`All methods failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function downloadVideo(url: string, outputPath: string): Promise<void> {
  // This would use ytdl-core or similar to download the video
  // Implementation depends on your backend setup
  throw new Error('Not implemented - requires backend processing');
}
