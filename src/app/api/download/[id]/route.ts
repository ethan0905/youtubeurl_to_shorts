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

    // Check if video file exists
    if (segment.outputPath) {
      const filePath = path.join(process.cwd(), 'public', segment.outputPath);
      
      if (fs.existsSync(filePath)) {
        // Stream the actual video file
        const stat = fs.statSync(filePath);
        const fileStream = fs.createReadStream(filePath);
        
        return new NextResponse(fileStream as any, {
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size.toString(),
            'Content-Disposition': `attachment; filename="short_${segment.id}.mp4"`,
          },
        });
      }
    }

    // Fallback: Return metadata if video file doesn't exist
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
      note: 'Video file not yet generated. Make sure FFmpeg is installed and the video has been processed.',
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
