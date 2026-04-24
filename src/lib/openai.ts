import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeVideoSegment(
  videoUrl: string,
  startTime: number,
  endTime: number
): Promise<{ title: string; description: string }> {
  try {
    // Note: OpenAI's vision API doesn't directly support video URLs yet
    // This is a placeholder for the actual implementation
    // You would need to extract frames from the video first
    
    const prompt = `Create a compelling title and description for a YouTube Short extracted from a video.
The segment is from ${startTime}s to ${endTime}s (${Math.round(endTime - startTime)}s duration).

Return a JSON object with:
- title: A catchy, engaging title (max 100 characters)
- description: A brief description (max 200 characters)

Make it engaging and optimized for social media.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating viral social media content titles and descriptions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      title: result.title || `Short ${startTime}-${endTime}`,
      description: result.description || '',
    };
  } catch (error) {
    console.error('Error analyzing segment with OpenAI:', error);
    return {
      title: `Short ${startTime}s-${endTime}s`,
      description: 'Generated short video',
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
