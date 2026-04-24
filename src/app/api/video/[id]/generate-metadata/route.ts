import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeVideoSegment } from '@/lib/openai';

/**
 * Generate AI metadata (titles/descriptions) for all segments
 * WITHOUT downloading the video
 */
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
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    console.log(`🤖 Generating metadata for ${video.segments.length} segments...`);

    // Generate metadata for each segment (no video download)
    const updatedSegments = [];
    
    for (let i = 0; i < video.segments.length; i++) {
      const segment = video.segments[i];
      
      console.log(`📝 Segment ${i + 1}/${video.segments.length}...`);
      
      // Generate metadata using OpenAI with video context
      const metadata = await analyzeVideoSegment(
        video.title || 'Vidéo YouTube',
        video.youtubeUrl,
        segment.startTime,
        segment.endTime,
        i
      );
      
      console.log(`✅ "${metadata.title}"`);

      // Update segment with metadata (don't mark as processed yet)
      const updatedSegment = await prisma.segment.update({
        where: { id: segment.id },
        data: {
          title: metadata.title,
          description: metadata.description,
        },
      });

      updatedSegments.push(updatedSegment);
    }

    // Update video status
    await prisma.video.update({
      where: { id: params.id },
      data: { status: 'metadata_ready' },
    });

    console.log('✅ All metadata generated!');

    return NextResponse.json({ 
      success: true, 
      segments: updatedSegments 
    });
  } catch (error: any) {
    console.error('❌ Error generating metadata:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate metadata' },
      { status: 500 }
    );
  }
}
