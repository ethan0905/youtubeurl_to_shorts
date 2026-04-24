import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

export interface VideoProcessingOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  format?: 'mp4';
  resolution?: '1080x1920' | '720x1280'; // Vertical format for shorts
}

export async function extractVideoSegment(
  options: VideoProcessingOptions
): Promise<string> {
  const { inputPath, outputPath, startTime, endTime, resolution = '1080x1920' } = options;

  return new Promise((resolve, reject) => {
    const duration = endTime - startTime;

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .size(resolution)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .on('end', () => {
        console.log('Processing finished successfully');
        resolve(outputPath);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Error processing video:', err.message);
        console.error('FFmpeg stderr:', stderr);
        reject(err);
      })
      .run();
  });
}

export async function downloadYouTubeVideo(
  videoId: string,
  outputDir: string
): Promise<string> {
  // This would use ytdl-core or yt-dlp
  // Placeholder implementation
  const outputPath = path.join(outputDir, `${videoId}.mp4`);
  
  return new Promise((resolve, reject) => {
    // In a real implementation, you would:
    // 1. Use ytdl-core or spawn yt-dlp process
    // 2. Download the video
    // 3. Return the path
    
    // For now, this is a placeholder
    resolve(outputPath);
  });
}

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export async function generateThumbnail(
  videoPath: string,
  thumbnailPath: string,
  timeInSeconds: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        timemarks: [timeInSeconds],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: '1080x1920',
      })
      .on('end', () => {
        resolve(thumbnailPath);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}
