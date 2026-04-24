import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      include: {
        segments: {
          where: {
            selected: true,
            processed: true,
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Create metadata for all segments
    const allSegments = video.segments.map((segment, index) => ({
      segment_number: index + 1,
      segment_id: segment.id,
      title: segment.title,
      description: segment.description,
      start_time: segment.startTime,
      end_time: segment.endTime,
      duration: segment.endTime - segment.startTime,
      youtube_timestamp: `https://www.youtube.com/watch?v=${video.youtubeId}&t=${Math.floor(segment.startTime)}s`,
    }));

    const metadata = {
      video_id: video.id,
      video_title: video.title,
      youtube_url: video.youtubeUrl,
      total_segments: video.segments.length,
      segments: allSegments,
      note: 'Le téléchargement de vidéos nécessite FFmpeg et le traitement vidéo backend. Actuellement, seules les métadonnées sont disponibles. Utilisez les timestamps YouTube ci-dessus pour voir les segments dans la vidéo originale.',
    };

    return NextResponse.json(metadata, {
      headers: {
        'Content-Disposition': `attachment; filename="all_segments_${video.id}_metadata.json"`,
      },
    });
  } catch (error: any) {
    console.error('Error downloading all segments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download segments' },
      { status: 500 }
    );
  }
}
