import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeVideoForBestMoments } from '@/lib/openai';
import { getSegmentTranscript } from '@/lib/youtube-transcript';

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

    // Create segments in database with transcripts
    const segments = await Promise.all(
      moments.map(async (moment) => {
        // Fetch transcript for this segment
        let transcript = null;
        try {
          transcript = await getSegmentTranscript(
            video.youtubeId,
            moment.startTime,
            moment.endTime
          );
        } catch (error) {
          console.log(`⚠️ Could not fetch transcript for segment ${moment.startTime}-${moment.endTime}`);
        }

        return prisma.segment.create({
          data: {
            videoId: video.id,
            startTime: moment.startTime,
            endTime: moment.endTime,
            score: moment.score,
            selected: true,
            transcript: transcript,
          },
        });
      })
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
