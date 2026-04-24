import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface VideoProcessingOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  format?: 'mp4';
  resolution?: '1080x1920' | '720x1280'; // Vertical format for shorts
  cropX?: number; // Horizontal crop position (0-1, 0.5 is center)
}

export async function extractVideoSegment(
  options: VideoProcessingOptions
): Promise<string> {
  const { inputPath, outputPath, startTime, endTime, resolution = '1080x1920', cropX = 0.5 } = options;

  return new Promise((resolve, reject) => {
    const duration = endTime - startTime;
    
    // Calculate crop filter for vertical video (9:16 aspect ratio)
    // Input is typically 16:9 (1920x1080 or similar)
    // Output is 9:16 (1080x1920)
    
    // For a 1920x1080 input:
    // - Output width should be 1080 (9/16 of output height 1920)
    // - We need to crop the width from 1920 to 607.5 (to maintain 9:16 when scaled)
    // - Then scale to 1080x1920
    
    // Calculate crop parameters
    // cropX: 0 = left, 0.5 = center, 1 = right
    const outputWidth = 1080;
    const outputHeight = 1920;
    const targetAspect = outputWidth / outputHeight; // 0.5625 (9:16)
    
    // Crop filter: crop=out_w:out_h:x:y
    // We'll use scale and crop together
    // First get input dimensions, then calculate crop
    
    const videoFilters = [
      // Method: crop a vertical slice, then scale to target resolution
      // For 16:9 source (1920x1080): crop width = 1080 * (9/16) = 607.5
      // Position the crop based on cropX
      `crop=in_h*9/16:in_h:(in_w-in_h*9/16)*${cropX}:0`,
      `scale=${outputWidth}:${outputHeight}`,
    ].join(',');

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoFilters(videoFilters)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('start', (commandLine: string) => {
        console.log('FFmpeg command:', commandLine);
        console.log(`📐 Crop position: ${(cropX * 100).toFixed(0)}% from left`);
      })
      .on('progress', (progress: any) => {
        console.log(`Processing: ${progress.percent?.toFixed(1) || 0}% done`);
      })
      .on('end', () => {
        console.log('Processing finished successfully');
        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        console.error('Error processing video:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Extract a thumbnail image from a video at a specific timestamp
 */
export async function extractThumbnail(
  videoPath: string,
  timestamp: number,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .frames(1)
      .output(outputPath)
      .on('start', (commandLine: string) => {
        console.log('FFmpeg thumbnail command:', commandLine);
      })
      .on('end', () => {
        console.log(`✅ Thumbnail extracted: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        console.error('❌ Error extracting thumbnail:', err.message);
        reject(err);
      })
      .run();
  });
}

export async function downloadYouTubeVideo(
  videoId: string,
  outputDir: string
): Promise<string> {
  ensureDirectoryExists(outputDir);
  const outputPath = path.join(outputDir, `${videoId}.mp4`);
  
  // Check if file exists and is valid
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    // If file is larger than 1KB, consider it valid (basic check)
    if (stats.size > 1024) {
      console.log(`✅ Video already downloaded: ${outputPath}`);
      return outputPath;
    } else {
      console.log(`⚠️  Removing corrupted file: ${outputPath}`);
      fs.unlinkSync(outputPath);
    }
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`📥 Downloading YouTube video: ${videoId}`);

  try {
    // Use yt-dlp with best quality mp4 format
    const command = `yt-dlp -f "bv*+ba/b" --merge-output-format mp4 -o "${outputPath}" "${url}"`;
    
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for output
    });

    if (stdout) console.log(stdout);
    if (stderr) console.warn(stderr);

    // Verify file was created and has content
    if (!fs.existsSync(outputPath)) {
      throw new Error('Download completed but file not found');
    }

    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      fs.unlinkSync(outputPath);
      throw new Error('Downloaded file is empty');
    }

    console.log(`✅ Download complete: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    return outputPath;

  } catch (error: any) {
    console.error('❌ Download failed:', error.message);
    
    // Clean up partial download
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    
    throw new Error(`Failed to download video: ${error.message}`);
  }
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
