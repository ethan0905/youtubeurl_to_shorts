import OpenAI from 'openai';

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
  // This is a simplified algorithm
  // In a real implementation, you would use:
  // 1. Video analysis to detect scene changes, audio peaks, etc.
  // 2. OpenAI Vision API on extracted frames
  // 3. Audio analysis for interesting moments
  
  const segments = [];
  const targetDuration = 45; // Target 45 second clips
  const minDuration = 30;
  const maxDuration = 60;
  
  // Simple algorithm: create segments throughout the video
  const numSegments = Math.min(5, Math.floor(duration / 60)); // Max 5 segments
  
  for (let i = 0; i < numSegments; i++) {
    const segmentStart = Math.floor((duration / (numSegments + 1)) * (i + 1));
    const segmentDuration = targetDuration + Math.random() * 15 - 7.5; // 37-52s
    const segmentEnd = Math.min(segmentStart + segmentDuration, duration);
    
    if (segmentEnd - segmentStart >= minDuration) {
      segments.push({
        startTime: segmentStart,
        endTime: segmentEnd,
        score: 0.6 + Math.random() * 0.4, // Random score between 0.6 and 1.0
      });
    }
  }
  
  return segments.sort((a, b) => b.score - a.score);
}
