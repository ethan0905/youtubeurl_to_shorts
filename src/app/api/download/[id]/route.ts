import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const segment = await prisma.segment.findUnique({
      where: { id: params.id },
      include: {
        video: true,
      },
    });

    if (!segment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    // For now, return metadata as JSON since actual video files aren't generated yet
    // In production, you would return the actual video file here
    const metadata = {
      segment_id: segment.id,
      video_id: segment.videoId,
      title: segment.title,
      description: segment.description,
      start_time: segment.startTime,
      end_time: segment.endTime,
      duration: segment.endTime - segment.startTime,
      youtube_url: segment.video.youtubeUrl,
      youtube_id: segment.video.youtubeId,
      note: 'Le téléchargement de vidéos nécessite FFmpeg et le traitement vidéo backend. Actuellement, seules les métadonnées sont disponibles.',
    };

    return NextResponse.json(metadata, {
      headers: {
        'Content-Disposition': `attachment; filename="segment_${segment.id}_metadata.json"`,
      },
    });
  } catch (error: any) {
    console.error('Error downloading segment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download segment' },
      { status: 500 }
    );
  }
}
