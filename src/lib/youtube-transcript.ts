import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Fetch transcript for a specific segment of a YouTube video
 */
export async function getSegmentTranscript(
  youtubeId: string,
  startTime: number,
  endTime: number
): Promise<string | null> {
  try {
    console.log(`📝 Fetching transcript for ${youtubeId} from ${startTime}s to ${endTime}s...`);
    
    // Fetch full transcript
    const transcript = await YoutubeTranscript.fetchTranscript(youtubeId);
    
    if (!transcript || transcript.length === 0) {
      console.log('⚠️ No transcript available for this video');
      return null;
    }
    
    // Filter transcript entries within the time range
    const segmentEntries = transcript.filter(entry => {
      const entryStart = entry.offset / 1000; // Convert ms to seconds
      const entryEnd = entryStart + (entry.duration / 1000);
      
      // Include if any part of the entry overlaps with our segment
      return (entryStart >= startTime && entryStart < endTime) ||
             (entryEnd > startTime && entryEnd <= endTime) ||
             (entryStart < startTime && entryEnd > endTime);
    });
    
    if (segmentEntries.length === 0) {
      console.log('⚠️ No transcript found for this time range');
      return null;
    }
    
    // Combine the text entries
    const transcriptText = segmentEntries
      .map(entry => entry.text)
      .join(' ')
      .trim();
    
    console.log(`✅ Transcript fetched: ${transcriptText.substring(0, 100)}...`);
    
    return transcriptText;
  } catch (error: any) {
    console.error('❌ Error fetching transcript:', error.message);
    
    // If transcripts are disabled for this video, return null instead of throwing
    if (error.message?.includes('disabled') || error.message?.includes('available')) {
      console.log('ℹ️ Transcripts not available for this video');
      return null;
    }
    
    throw error;
  }
}

/**
 * Check if a YouTube video has transcripts available
 */
export async function hasTranscript(youtubeId: string): Promise<boolean> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(youtubeId);
    return transcript && transcript.length > 0;
  } catch (error) {
    return false;
  }
}
