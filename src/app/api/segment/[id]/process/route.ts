import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { downloadYouTubeVideo, extractVideoSegment, ensureDirectoryExists } from '@/lib/video-processing';
import path from 'path';

/**
 * Download video and process a SINGLE segment
 * Called when user clicks download button on a specific short
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const segment = await prisma.segment.findUnique({
      where: { id: params.id },
      include: { video: true },
    });

    if (!segment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    const video = segment.video;

    console.log(`🎬 Processing segment ${segment.id}...`);

    // Setup directories
    const publicDir = path.join(process.cwd(), 'public');
    const uploadsDir = path.join(publicDir, 'uploads');
    const outputsDir = path.join(publicDir, 'outputs', video.id);
    
    ensureDirectoryExists(uploadsDir);
    ensureDirectoryExists(outputsDir);

    // Step 1: Download the YouTube video (if not already downloaded)
    let videoPath: string;
    try {
      console.log(`📥 Downloading video ${video.youtubeId}...`);
      videoPath = await downloadYouTubeVideo(video.youtubeId, uploadsDir);
      console.log(`✅ Video ready: ${videoPath}`);
    } catch (error: any) {
      console.error('❌ Download failed:', error);
      throw new Error(`Failed to download video: ${error.message}`);
    }

    // Step 2: Extract this specific segment with FFmpeg
    const outputFilename = `${segment.id}.mp4`;
    const outputPath = path.join(outputsDir, outputFilename);
    const publicOutputPath = `/outputs/${video.id}/${outputFilename}`;

    try {
      console.log(`✂️  Extracting segment (${segment.startTime}s - ${segment.endTime}s)...`);
      console.log(`📐 Using crop position: ${((segment.cropX ?? 0.5) * 100).toFixed(0)}%`);
      await extractVideoSegment({
        inputPath: videoPath,
        outputPath,
        startTime: segment.startTime,
        endTime: segment.endTime,
        cropX: segment.cropX ?? 0.5,
      });
      console.log(`✅ Segment extracted: ${outputPath}`);
    } catch (error: any) {
      console.error(`❌ Failed to extract segment:`, error);
      throw new Error(`Failed to extract segment: ${error.message}`);
    }

    // Step 3: Update segment as processed
    const updatedSegment = await prisma.segment.update({
      where: { id: segment.id },
      data: {
        processed: true,
        outputPath: publicOutputPath,
      },
    });

    console.log(`✅ Segment processing complete!`);

    return NextResponse.json({ 
      success: true, 
      segment: updatedSegment 
    });
  } catch (error: any) {
    console.error('❌ Error processing segment:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to process segment' },
      { status: 500 }
    );
  }
}
