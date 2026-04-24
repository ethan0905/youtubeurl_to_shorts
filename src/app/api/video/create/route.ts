import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { youtubeUrl, youtubeId, title, thumbnail, duration } = await request.json();

    if (!youtubeUrl || !youtubeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const video = await prisma.video.create({
      data: {
        youtubeUrl,
        youtubeId,
        title,
        thumbnail,
        duration,
        status: 'pending',
      },
    });

    return NextResponse.json(video);
  } catch (error: any) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create video' },
      { status: 500 }
    );
  }
}
