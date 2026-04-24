import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeVideoSegment } from '@/lib/openai';

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

    // Process each selected segment
    // This is a simplified version - in production, use a queue system
    const processedSegments = [];

    for (const segment of video.segments) {
      // Generate metadata using OpenAI
      const metadata = await analyzeVideoSegment(
        video.youtubeUrl,
        segment.startTime,
        segment.endTime
      );

      // Update segment with metadata
      const updatedSegment = await prisma.segment.update({
        where: { id: segment.id },
        data: {
          title: metadata.title,
          description: metadata.description,
          processed: true,
          outputPath: `/outputs/${video.id}/${segment.id}.mp4`, // Placeholder
        },
      });

      processedSegments.push(updatedSegment);
    }

    // Update video status to completed
    await prisma.video.update({
      where: { id: params.id },
      data: { status: 'completed' },
    });

    return NextResponse.json({ success: true, segments: processedSegments });
  } catch (error: any) {
    console.error('Error processing video:', error);
    
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
