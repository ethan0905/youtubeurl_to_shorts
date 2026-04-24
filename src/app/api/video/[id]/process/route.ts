import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeVideoSegment } from '@/lib/openai';
import { downloadYouTubeVideo, extractVideoSegment, ensureDirectoryExists } from '@/lib/video-processing';
import path from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: params.id },
      include: {
        segments: {
          where: { selected: true },
        },
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Update video status
    await prisma.video.update({
      where: { id: params.id },
      data: { status: 'processing' },
    });

    // Setup directories
    const publicDir = path.join(process.cwd(), 'public');
    const uploadsDir = path.join(publicDir, 'uploads');
    const outputsDir = path.join(publicDir, 'outputs', video.id);
    
    ensureDirectoryExists(uploadsDir);
    ensureDirectoryExists(outputsDir);

    console.log('🎬 Starting video processing...');
    
    // Step 1: Download the YouTube video
    let videoPath: string;
    try {
      console.log(`📥 Downloading video ${video.youtubeId}...`);
      videoPath = await downloadYouTubeVideo(video.youtubeId, uploadsDir);
      console.log(`✅ Video downloaded: ${videoPath}`);
    } catch (error: any) {
      console.error('❌ Download failed:', error);
      throw new Error(`Failed to download video: ${error.message}`);
    }

    // Step 2: Process each selected segment
    const processedSegments = [];

    for (let i = 0; i < video.segments.length; i++) {
      const segment = video.segments[i];
      
      console.log(`\n🎞️  Processing segment ${i + 1}/${video.segments.length}...`);
      
      // Generate metadata using OpenAI with video context
      console.log('🤖 Generating metadata with AI...');
      const metadata = await analyzeVideoSegment(
        video.title || 'Vidéo YouTube',
        video.youtubeUrl,
        segment.startTime,
        segment.endTime,
        i
      );
      console.log(`✅ Metadata: "${metadata.title}"`);

      // Extract video segment with FFmpeg
      const outputFilename = `${segment.id}.mp4`;
      const outputPath = path.join(outputsDir, outputFilename);
      const publicOutputPath = `/outputs/${video.id}/${outputFilename}`;

      try {
        console.log(`✂️  Extracting segment (${segment.startTime}s - ${segment.endTime}s)...`);
        await extractVideoSegment({
          inputPath: videoPath,
          outputPath,
          startTime: segment.startTime,
          endTime: segment.endTime,
        });
        console.log(`✅ Segment extracted: ${outputPath}`);
      } catch (error: any) {
        console.error(`❌ Failed to extract segment:`, error);
        throw new Error(`Failed to extract segment: ${error.message}`);
      }

      // Update segment with metadata and output path
      const updatedSegment = await prisma.segment.update({
        where: { id: segment.id },
        data: {
          title: metadata.title,
          description: metadata.description,
          processed: true,
          outputPath: publicOutputPath,
        },
      });

      processedSegments.push(updatedSegment);
      console.log(`✅ Segment ${i + 1} complete!`);
    }

    // Update video status to completed
    await prisma.video.update({
      where: { id: params.id },
      data: { status: 'completed' },
    });

    console.log('🎉 All segments processed successfully!');

    return NextResponse.json({ success: true, segments: processedSegments });
  } catch (error: any) {
    console.error('❌ Error processing video:', error);
    
    // Update video status to failed
    await prisma.video.update({
      where: { id: params.id },
      data: { status: 'failed' },
    });

    return NextResponse.json(
      { error: error.message || 'Failed to process video' },
      { status: 500 }
    );
  }
}
