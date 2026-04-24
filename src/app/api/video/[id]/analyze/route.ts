import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeVideoForBestMoments } from '@/lib/openai';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: params.id },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Analyze video to find best moments
    const moments = await analyzeVideoForBestMoments(
      video.youtubeId,
      video.duration || 0
    );

    // Create segments in database
    const segments = await Promise.all(
      moments.map((moment) =>
        prisma.segment.create({
          data: {
            videoId: video.id,
            startTime: moment.startTime,
            endTime: moment.endTime,
            score: moment.score,
            selected: true,
          },
        })
      )
    );

    // Update video status
    await prisma.video.update({
      where: { id: params.id },
      data: { status: 'analyzed' },
    });

    return NextResponse.json({ segments });
  } catch (error: any) {
    console.error('Error analyzing video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze video' },
      { status: 500 }
    );
  }
}
