import OpenAI from 'openai';
import { YoutubeTranscript } from 'youtube-transcript';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeVideoSegment(
  videoTitle: string,
  videoUrl: string,
  startTime: number,
  endTime: number,
  segmentIndex: number
): Promise<{ title: string; description: string }> {
  try {
    const duration = Math.round(endTime - startTime);
    const startMinutes = Math.floor(startTime / 60);
    const startSeconds = Math.floor(startTime % 60);
    
    const prompt = `Crée un titre et une description captivants pour un Short YouTube extrait de cette vidéo:

VIDÉO ORIGINALE: "${videoTitle}"
SEGMENT: Du moment ${startMinutes}:${startSeconds.toString().padStart(2, '0')} (durée: ${duration}s)

Crée un titre et une description qui:
1. Sont en FRANÇAIS
2. Sont cohérents avec le sujet de la vidéo originale
3. Mettent en avant ce moment spécifique (${segmentIndex === 0 ? 'début' : segmentIndex === 1 ? 'milieu' : 'fin/climax'} de la vidéo)
4. Sont optimisés pour les shorts (accrocheurs, incitent au clic)
5. Respectent l'essence et le ton de la vidéo originale

Retourne un objet JSON avec:
- title: Titre accrocheur (max 80 caractères, en français)
- description: Description engageante (max 150 caractères, en français)

Exemples de bon format:
- Si vidéo = "Recette gâteau chocolat", segment du milieu → title: "La technique secrète pour un gâteau parfait 🍫"
- Si vidéo = "Tutoriel guitare", segment de fin → title: "Le riff qui change tout 🎸"`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en création de contenu viral pour les réseaux sociaux. Tu crées TOUJOURS du contenu en français, cohérent avec le sujet original.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      title: result.title || `${videoTitle} - Extrait ${segmentIndex + 1}`,
      description: result.description || `Extrait ${duration}s de "${videoTitle}"`,
    };
  } catch (error) {
    console.error('Error analyzing segment with OpenAI:', error);
    return {
      title: `${videoTitle} - Partie ${segmentIndex + 1}`,
      description: `Extrait de ${Math.round(endTime - startTime)}s`,
    };
  }
}

export async function analyzeVideoForBestMoments(
  videoId: string,
  duration: number
): Promise<Array<{ startTime: number; endTime: number; score: number }>> {
  try {
    console.log(`🔍 Analyzing video ${videoId} (${duration}s) for viral moments...`);
    
    // Try to fetch transcript for intelligent analysis
    let transcript = null;
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId);
      console.log(`✅ Transcript fetched: ${transcript.length} entries`);
    } catch (error) {
      console.log('⚠️ No transcript available, using time-based analysis');
    }

    if (transcript && transcript.length > 0) {
      // Use AI to analyze transcript and find viral moments
      return await analyzeTranscriptForViralMoments(transcript, duration);
    } else {
      // Fallback: Create evenly distributed segments
      return createTimeBasedSegments(duration);
    }
  } catch (error) {
    console.error('❌ Error analyzing video:', error);
    // Fallback to time-based segments
    return createTimeBasedSegments(duration);
  }
}

/**
 * Analyze transcript using AI to find the most viral/interesting moments
 */
async function analyzeTranscriptForViralMoments(
  transcript: Array<{ text: string; offset: number; duration: number }>,
  videoDuration: number
): Promise<Array<{ startTime: number; endTime: number; score: number }>> {
  try {
    // Combine transcript into text with timestamps
    const transcriptText = transcript
      .map((entry, i) => {
        const time = Math.floor(entry.offset / 1000);
        return `[${time}s] ${entry.text}`;
      })
      .join(' ');

    // Limit transcript length for API (max ~3000 chars for efficiency)
    const limitedTranscript = transcriptText.length > 3000 
      ? transcriptText.substring(0, 3000) + '...' 
      : transcriptText;

    console.log('🤖 Asking AI to find viral moments...');

    const prompt = `Analyse cette transcription de vidéo YouTube et identifie les 5-8 moments les plus viraux/accrocheurs pour créer des Shorts.

TRANSCRIPTION:
${limitedTranscript}

DURÉE VIDÉO: ${videoDuration} secondes

Trouve les moments qui sont:
- Surprenants ou choquants
- Drôles ou émotionnels
- Contiennent des informations clés/révélations
- Ont un "hook" fort au début
- Se suffisent à eux-même (compréhensibles hors contexte)
- Durent entre 30-60 secondes

Pour chaque moment, retourne un objet JSON avec:
- startTime: Début en secondes (number)
- endTime: Fin en secondes (number, +30 à +60s du début)
- reason: Pourquoi ce moment est viral (string)
- score: Score de viralité 0-1 (number)

Retourne un tableau JSON de 5-8 segments minimum.

Format: { "segments": [{"startTime": 0, "endTime": 45, "reason": "...", "score": 0.95}, ...] }`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en création de contenu viral pour TikTok et YouTube Shorts. Tu analyses les transcriptions pour trouver les moments les plus captivants.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"segments":[]}');
    
    if (result.segments && result.segments.length > 0) {
      console.log(`✅ AI found ${result.segments.length} viral moments`);
      
      // Validate and return segments
      return result.segments
        .map((seg: any) => ({
          startTime: Math.max(0, Math.floor(seg.startTime)),
          endTime: Math.min(videoDuration, Math.floor(seg.endTime)),
          score: seg.score || 0.8,
        }))
        .filter((seg: any) => 
          seg.endTime > seg.startTime && 
          (seg.endTime - seg.startTime) >= 20 && // At least 20s
          (seg.endTime - seg.startTime) <= 60    // Max 60s
        )
        .slice(0, 10); // Max 10 segments
    }
    
    // If AI didn't return good segments, fallback
    console.log('⚠️ AI analysis failed, using fallback');
    return createTimeBasedSegments(videoDuration);
    
  } catch (error) {
    console.error('❌ Error in AI analysis:', error);
    return createTimeBasedSegments(videoDuration);
  }
}

/**
 * Create time-based segments as fallback (ensures at least 5 segments)
 */
function createTimeBasedSegments(
  duration: number
): Array<{ startTime: number; endTime: number; score: number }> {
  const segments = [];
  const targetDuration = 45; // Target 45 second clips
  const minDuration = 30;
  const maxDuration = 60;
  
  // Calculate number of segments (minimum 5)
  const numSegments = Math.max(5, Math.min(10, Math.floor(duration / 90)));
  
  console.log(`📊 Creating ${numSegments} time-based segments for ${duration}s video`);
  
  for (let i = 0; i < numSegments; i++) {
    // Distribute segments throughout the video
    const segmentStart = Math.floor((duration / (numSegments + 1)) * (i + 1));
    const segmentDuration = Math.min(
      targetDuration,
      duration - segmentStart
    );
    const segmentEnd = Math.min(
      segmentStart + segmentDuration,
      duration
    );
    
    if (segmentEnd - segmentStart >= 20) { // At least 20s
      segments.push({
        startTime: segmentStart,
        endTime: segmentEnd,
        score: 0.6 + (Math.random() * 0.4), // Random score between 0.6 and 1.0
      });
    }
  }
  
  // If we don't have enough segments, create more from the beginning
  let additionalIndex = 0;
  while (segments.length < 5 && duration >= 30 && additionalIndex < 10) {
    const start = additionalIndex * 50;
    if (start + 30 <= duration) {
      segments.push({
        startTime: start,
        endTime: Math.min(start + 45, duration),
        score: 0.5 + (Math.random() * 0.3),
      });
    } else {
      break;
    }
    additionalIndex++;
  }
  
  return segments
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Max 10 segments
}
